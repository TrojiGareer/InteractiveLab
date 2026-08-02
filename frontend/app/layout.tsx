import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Protocol Lab | TCP Handshake Simulator",
  description: "An interactive TCP three-way handshake simulator.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
