import { sqliteTable, text, integer, index } from "drizzle-orm/sqlite-core";
export const playlists = sqliteTable("playlists", {
 id:text("id").primaryKey(), title:text("title").notNull(), tracks:text("tracks").notNull(), updatedAt:integer("updated_at").notNull()
});
export const games = sqliteTable("games", {
 id:text("id").primaryKey(), visitor:text("visitor").notNull(), playlistId:text("playlist_id").notNull(),
 tracks:text("tracks").notNull(), createdAt:integer("created_at").notNull(), completedAt:integer("completed_at"),
 results:text("results"), winners:text("winners")
}, t=>[index("idx_games_visitor_created").on(t.visitor,t.createdAt)]);
