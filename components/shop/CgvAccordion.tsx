"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";

interface Section {
  title: string;
  content: string;
}

export function CgvAccordion({ sections }: { sections: Section[] }) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <div className="space-y-2">
      {sections.map((section, i) => {
        const isOpen = openIndex === i;

        return (
          <div key={i} className="card-premium overflow-hidden">
            <button
              onClick={() => setOpenIndex(isOpen ? null : i)}
              className="w-full flex items-center justify-between px-6 py-4 text-left gap-4"
              aria-expanded={isOpen}
            >
              <span className="text-sm font-semibold text-foreground">{section.title}</span>
              <ChevronDown
                size={16}
                className={`shrink-0 text-muted-foreground transition-transform duration-300 ${isOpen ? "rotate-180" : ""}`}
              />
            </button>

            <div className={`grid transition-all duration-300 ease-in-out ${isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}>
              <div className="overflow-hidden">
                <div className="px-6 pb-6 border-t border-border pt-4 space-y-3">
                  {section.content.split("\n\n").map((para, j) => (
                    <p key={j} className="text-sm text-muted-foreground leading-relaxed">
                      {para}
                    </p>
                  ))}
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
