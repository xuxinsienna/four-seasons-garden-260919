import type { Metadata, Viewport } from "next";
import "./globals-v3.css";
export const metadata:Metadata={title:"森间 · 四季庭院",description:"隐于山林的小屋，四季、昼夜与溪流。推门见山，临溪对饮。",icons:{icon:"/favicon.svg"}};
export const viewport:Viewport={width:"device-width",initialScale:1,viewportFit:"cover",themeColor:"#86a695"};
export default function RootLayout({children}:Readonly<{children:React.ReactNode}>){return <html lang="zh-CN"><body>{children}</body></html>;}


