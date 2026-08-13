import { NextResponse } from "next/server";
import { db } from "@/db";
import { messages, users } from "@/db/schema";
import { getSession, isValidUUID, MAX_MESSAGE_LENGTH } from "@/lib/auth";
import { eq, or, and, asc, ne } from "drizzle-orm";

export async function GET(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const withUserId = searchParams.get("with");

  try {
    if (withUserId) {
      if (!isValidUUID(withUserId)) {
        return NextResponse.json({ error: "Invalid user ID format" }, { status: 400 });
      }

      // Fetch direct conversation with a specific user
      const chatMessages = await db
        .select({
          id: messages.id,
          sender_id: messages.sender_id,
          receiver_id: messages.receiver_id,
          content: messages.content,
          created_at: messages.created_at,
          sender: {
            id: users.id,
            name: users.name,
            role: users.role,
          },
        })
        .from(messages)
        .innerJoin(users, eq(messages.sender_id, users.id))
        .where(
          or(
            and(eq(messages.sender_id, session.id), eq(messages.receiver_id, withUserId)),
            and(eq(messages.sender_id, withUserId), eq(messages.receiver_id, session.id))
          )
        )
        .orderBy(asc(messages.created_at));

      return NextResponse.json({ messages: chatMessages });
    }

    // Fetch contacts — employees see admins/managers only; admins/managers see all
    let contactsQuery;
    if (session.role === "employee") {
      contactsQuery = await db
        .select({
          id: users.id,
          name: users.name,
          email: users.email,
          role: users.role,
        })
        .from(users)
        .where(or(eq(users.role, "admin"), eq(users.role, "manager")));
    } else {
      contactsQuery = await db
        .select({
          id: users.id,
          name: users.name,
          email: users.email,
          role: users.role,
        })
        .from(users);
    }

    const filteredContacts = contactsQuery.filter((u) => u.id !== session.id);

    return NextResponse.json({ contacts: filteredContacts });
  } catch (error: any) {
    console.error("Messages fetch error:", error);
    return NextResponse.json({ error: "Failed to fetch messages" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { receiver_id, content } = await request.json();

    if (!receiver_id || !isValidUUID(receiver_id)) {
      return NextResponse.json({ error: "Valid receiver ID required" }, { status: 400 });
    }

    if (!content || typeof content !== "string" || !content.trim()) {
      return NextResponse.json({ error: "Message content is required" }, { status: 400 });
    }

    if (content.length > MAX_MESSAGE_LENGTH) {
      return NextResponse.json({ error: `Message exceeds ${MAX_MESSAGE_LENGTH} character limit` }, { status: 400 });
    }

    if (receiver_id === session.id) {
      return NextResponse.json({ error: "Cannot send messages to yourself" }, { status: 400 });
    }

    // Verify receiver exists
    const [receiver] = await db.select({ id: users.id }).from(users).where(eq(users.id, receiver_id));
    if (!receiver) {
      return NextResponse.json({ error: "Recipient user not found" }, { status: 404 });
    }

    const [newMessage] = await db
      .insert(messages)
      .values({
        sender_id: session.id,
        receiver_id,
        content: content.trim(),
      })
      .returning();

    // Fetch sender info for response
    const [sender] = await db
      .select({ id: users.id, name: users.name, role: users.role })
      .from(users)
      .where(eq(users.id, session.id));

    return NextResponse.json(
      {
        message: {
          ...newMessage,
          sender,
        },
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Message send error:", error);
    return NextResponse.json({ error: "Failed to send message" }, { status: 500 });
  }
}
