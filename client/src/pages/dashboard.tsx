import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Upload } from "lucide-react";

export default function DashboardPage() {
  const [isDragging, setIsDragging] = useState(false);
  const [convertedText, setConvertedText] = useState("");

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files);
    if (files.length === 0) return;

    const formData = new FormData();
    formData.append("file", files[0]);

    try {
      const response = await fetch("/api/convert", {
        method: "POST",
        body: formData,
      });

      const result = await response.text();
      setConvertedText(result);
    } catch (error) {
      console.error("Error converting file:", error);
    }
  };

  return (
    <div className="space-y-6 p-4 max-w-4xl mx-auto">
      <Card
        className={`p-8 border-2 border-dashed ${
          isDragging ? "border-primary" : "border-muted"
        } rounded-lg text-center`}
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
      >
        <Upload className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
        <h2 className="text-lg font-medium mb-2">Drag and drop your file here</h2>
        <p className="text-sm text-muted-foreground mb-4">
          Supports PDF, Word, PowerPoint, Excel and more
        </p>
        <Button variant="outline">
          Or click to select a file
        </Button>
      </Card>

      {convertedText && (
        <Card className="p-6">
          <h3 className="text-lg font-medium mb-4">Converted Text</h3>
          <pre className="whitespace-pre-wrap bg-muted p-4 rounded-lg">
            {convertedText}
          </pre>
        </Card>
      )}
    </div>
  );
}