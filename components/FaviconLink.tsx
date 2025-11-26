"use client";

import { useEffect } from "react";

export function FaviconLink() {
  useEffect(() => {
    // Check if link already exists
    const existingLink = document.querySelector('link[rel="icon"]');
    if (!existingLink) {
      const link = document.createElement("link");
      link.rel = "icon";
      link.href = "/favicon.png";
      link.setAttribute("sizes", "any");
      document.head.appendChild(link);
    }
  }, []);

  return null;
}

