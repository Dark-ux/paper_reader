import { Brain, Send } from "lucide-react";

import { Button } from "../ui/button";

export function AiReadingPanel() {
  return (
    <aside className="flex min-h-[calc(100vh-2rem)] w-full flex-col rounded-lg border bg-card lg:w-96">
      <div className="flex h-12 items-center gap-2 border-b px-4">
        <Brain className="h-4 w-4 text-primary" aria-hidden="true" />
        <h2 className="text-sm font-semibold">AI 精读</h2>
      </div>
      <div className="flex flex-1 flex-col gap-3 overflow-auto p-4">
        <div className="rounded-md border bg-background p-3 text-sm">
          <div className="font-medium">摘要</div>
          <p className="mt-2 text-muted-foreground">等待选择文献</p>
        </div>
        <div className="rounded-md border bg-background p-3 text-sm">
          <div className="font-medium">问答</div>
          <p className="mt-2 text-muted-foreground">上下文检索待接入</p>
        </div>
      </div>
      <div className="border-t p-3">
        <div className="flex gap-2">
          <input
            className="h-9 min-w-0 flex-1 rounded-md border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
            placeholder="提问"
          />
          <Button size="icon" title="发送">
            <Send className="h-4 w-4" aria-hidden="true" />
          </Button>
        </div>
      </div>
    </aside>
  );
}
