create table
  public."Chat" (
    id text not null,
    "userID" uuid not null,
    "previewName" text null,
    "createdAt" timestamp with time zone not null default now(),
    "updatedAt" timestamp with time zone not null default now(),
    constraint Chat_pkey primary key (id),
    constraint Chat_userID_fkey foreign key ("userID") references auth.users (id)
  ) tablespace pg_default;
CREATE UNIQUE INDEX "Chat_pkey" ON public."Chat" USING btree (id);
CREATE INDEX "Chat_userID_idx" ON public."Chat" USING btree ("userID");

create table
  public."ChatMessage" (
    id text not null,
    "userID" uuid not null,
    "chatID" text not null,
    "messageType" text not null,
    "messageContent" text not null,
    "createdAt" timestamp with time zone not null default now(),
    "updatedAt" timestamp with time zone not null default now(),
    "responseStatus" text null,
    "responseMessageID" text null,
    constraint ChatMessage_pkey primary key (id),
    constraint ChatMessage_chatID_fkey foreign key ("chatID") references "Chat" (id) on update cascade on delete cascade,
    constraint ChatMessage_userID_fkey foreign key ("userID") references auth.users (id)
  ) tablespace pg_default;
CREATE UNIQUE INDEX "ChatMessage_pkey" ON public."ChatMessage" USING btree (id);
CREATE INDEX "ChatMessage_chatID_idx" ON public."ChatMessage" USING btree ("chatID");
