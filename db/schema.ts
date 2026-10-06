import { sqliteTable, text, integer, index } from "drizzle-orm/sqlite-core";
export const pickAdditions=sqliteTable('pick_additions',{
 playlistId:text('playlist_id').primaryKey(),data:text('data').notNull(),updatedAt:integer('updated_at').notNull()
});
export const playlists = sqliteTable("playlists", {
 id:text("id").primaryKey(), title:text("title").notNull(), tracks:text("tracks").notNull(), updatedAt:integer("updated_at").notNull()
});
export const games = sqliteTable("games", {
 id:text("id").primaryKey(), visitor:text("visitor").notNull(), playlistId:text("playlist_id").notNull(),
 tracks:text("tracks").notNull(), createdAt:integer("created_at").notNull(), completedAt:integer("completed_at"),
 results:text("results"), winners:text("winners")
}, t=>[index("idx_games_visitor_created").on(t.visitor,t.createdAt)]);
export const videoFacts = sqliteTable("video_facts", {
 id:text("id").primaryKey(),data:text("data").notNull(),checkedAt:integer("checked_at").notNull()
});
export const mediaLocks = sqliteTable("media_locks", {
 id:text("id").primaryKey(),owner:text("owner"),leaseUntil:integer("lease_until").notNull().default(0)
});
export const channelPreviews = sqliteTable("channel_previews", {
 id:text("id").primaryKey(),data:text("data").notNull(),checkedAt:integer("checked_at").notNull()
});
