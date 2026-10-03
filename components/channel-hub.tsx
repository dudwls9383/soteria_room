"use client";
import SmallChannelDiscovery from "./small-channel-discovery";
import ChannelTagExplorer from "./channel-tag-explorer";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "./ui/tabs";
export default function ChannelHub({
  adminKey,
  language,
  initialTab = "recommend",
}: {
  adminKey: string;
  language: "ko" | "ja" | "en";
  initialTab?: "recommend" | "archive";
}) {
  return (
    <Tabs defaultValue={initialTab} className="channel-hub">
      <TabsList aria-label="채널 탐색 방식">
        <TabsTrigger value="recommend">
          {language === "ko"
            ? "하꼬 추천"
            : language === "ja"
              ? "小さなチャンネル"
              : "Small channels"}
        </TabsTrigger>
        <TabsTrigger value="archive">
          {language === "ko"
            ? "채널 보관실"
            : language === "ja"
              ? "チャンネル保管室"
              : "Channel archive"}
        </TabsTrigger>
      </TabsList>
      <TabsContent value="recommend">
        <SmallChannelDiscovery adminKey={adminKey} language={language} />
      </TabsContent>
      <TabsContent value="archive">
        <ChannelTagExplorer initialTag="VocalMale" adminKey={adminKey} />
      </TabsContent>
    </Tabs>
  );
}
