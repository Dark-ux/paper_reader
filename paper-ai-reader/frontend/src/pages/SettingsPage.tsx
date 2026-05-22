import { Save } from "lucide-react";
import { useState } from "react";

import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";

export function SettingsPage() {
  const [apiBaseUrl, setApiBaseUrl] = useState("/api");
  const [model, setModel] = useState("qwen2.5:7b");
  const [embeddingModel, setEmbeddingModel] = useState("nomic-embed-text");

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4">
      <header>
        <h1 className="text-2xl font-semibold tracking-normal">设置</h1>
        <p className="mt-1 text-sm text-muted-foreground">本地服务与模型参数</p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>API</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          <label className="grid gap-2 text-sm">
            <span className="font-medium">后端地址</span>
            <input
              className="h-10 rounded-md border bg-background px-3 outline-none focus:ring-2 focus:ring-ring"
              value={apiBaseUrl}
              onChange={(event) => setApiBaseUrl(event.target.value)}
            />
          </label>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>AI</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          <label className="grid gap-2 text-sm">
            <span className="font-medium">对话模型</span>
            <input
              className="h-10 rounded-md border bg-background px-3 outline-none focus:ring-2 focus:ring-ring"
              value={model}
              onChange={(event) => setModel(event.target.value)}
            />
          </label>
          <label className="grid gap-2 text-sm">
            <span className="font-medium">嵌入模型</span>
            <input
              className="h-10 rounded-md border bg-background px-3 outline-none focus:ring-2 focus:ring-ring"
              value={embeddingModel}
              onChange={(event) => setEmbeddingModel(event.target.value)}
            />
          </label>
        </CardContent>
      </Card>

      <div>
        <Button>
          <Save className="h-4 w-4" aria-hidden="true" />
          保存
        </Button>
      </div>
    </div>
  );
}
