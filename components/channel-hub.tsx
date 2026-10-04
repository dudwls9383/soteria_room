"use client";
import {useState} from "react";
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
  const [picksOnly,setPicksOnly]=useState(false);
  return (
    <Tabs defaultValue={initialTab} className="channel-hub">
      <label className="room-button subtle" style={{marginBottom:12}}><input type="checkbox" checked={picksOnly} onChange={e=>setPicksOnly(e.target.checked)}/>{language==='ko'?'월의 픽 한정':language==='ja'?'月のPickのみ':'Monthly Picks only'}</label>
      <TabsList className="discovery-tabs glass" aria-label="채널 탐색 방식">
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
        <SmallChannelDiscovery adminKey={adminKey} language={language} picksOnly={picksOnly} />
      </TabsContent>
      <TabsContent value="archive">
        <ChannelTagExplorer initialTag="VocalMale" adminKey={adminKey} picksOnly={picksOnly} />
      </TabsContent>
    </Tabs>
  );
}
