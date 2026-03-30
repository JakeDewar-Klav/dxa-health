import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { ConvexClientProvider } from "./ConvexClientProvider";
import { RefreshProvider } from "./refresh-context";
import { AppSidebar } from "@/components/app-sidebar";
import { GlobalRefreshButton } from "@/components/global-refresh-button";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { TooltipProvider } from "@/components/ui/tooltip";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "DXA Account Health",
  description: "Demo Environment Health Monitor for Klaviyo DXA",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${jetbrainsMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <ConvexClientProvider>
          <TooltipProvider>
            <RefreshProvider>
              <SidebarProvider>
                <AppSidebar />
                <SidebarInset className="max-h-svh overflow-hidden">
                  <header className="flex h-16 shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
                    <div className="flex items-center gap-2 px-4">
                      <SidebarTrigger className="-ml-1" />
                      <Separator
                        orientation="vertical"
                        className="mr-2 data-vertical:h-4 data-vertical:self-auto"
                      />
                    </div>
                    <div className="ml-auto px-4">
                      <GlobalRefreshButton />
                    </div>
                  </header>
                  <main className="flex-1 overflow-auto">
                    {children}
                  </main>
                </SidebarInset>
              </SidebarProvider>
            </RefreshProvider>
          </TooltipProvider>
        </ConvexClientProvider>
      </body>
    </html>
  );
}
