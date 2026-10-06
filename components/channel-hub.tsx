"use client";
import {useState} from "react";
import RandomChannelDiscovery from "./random-channel-discovery";
import ChannelTagExplorer from "./channel-tag-explorer";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "./ui/tabs";
export default function ChannelHub({
  adminKey,
  language,
  initialTab = "archive",
}: {
  adminKey: string;
  language: "ko" | "ja" | "en";
  initialTab?: "random" | "archive";
}) {
  const [picksOnly,setPicksOnly]=useState(false);
  return (
    <Tabs defaultValue={initialTab} className="channel-hub">
      <TabsList className="discovery-tabs glass" aria-label="채널 탐색 방식">

        <TabsTrigger value="archive">
          {language === "ko"
            ? "전체 채널 보관실"
            : language === "ja"
              ? "全チャンネルの保管室"
              : "All-channel archive"}
        </TabsTrigger>
      <TabsTrigger value="random">{language === "ko" ? "랜덤 채널" : language === "ja" ? "ランダムチャンネル" : "Random channels"}</TabsTrigger>
      </TabsList>
      <TabsContent value="random"><RandomChannelDiscovery adminKey={adminKey}/></TabsContent>
      <TabsContent value="archive">
      <label className="room-button subtle" style={{marginBottom:12}}><input type="checkbox" checked={picksOnly} onChange={e=>setPicksOnly(e.target.checked)}/>{language==='ko'?'월의 픽 한정':language==='ja'?'月のPickのみ':'Monthly Picks only'}</label>

        <ChannelTagExplorer initialTag="VocalMale" adminKey={adminKey} picksOnly={picksOnly} />
      </TabsContent>
    </Tabs>
  );
}
