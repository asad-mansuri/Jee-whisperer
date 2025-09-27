import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, X, FileText, ArrowLeft } from "lucide-react";

interface Note {
  id: string;
  title: string;
  subtitle: string;
  url: string;
}

interface PDFViewerProps {
  url: string;
  title: string;
  onBack: () => void;
}

function PDFViewer({ url, title, onBack }: PDFViewerProps) {
  return (
    <div className="fixed inset-0 bg-background z-50 flex flex-col">
      <nav className="flex items-center px-4 py-2 bg-gradient-to-r from-primary to-primary/80 text-primary-foreground">
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={onBack}
          className="mr-2 hover:bg-primary-foreground/10"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h2 className="font-medium">{title}</h2>
      </nav>
      <iframe 
        src={url} 
        className="flex-1 w-full"
        style={{ border: 'none' }}
        title={title}
      />
    </div>
  );
}

export default function Notes() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPaper, setSelectedPaper] = useState<Note | null>(null);
  const [notes] = useState<Note[]>([
    {
      id: "1",
      title: "07 Jan Shift 01 - Chemistry v1 (2020)",
      subtitle: "Chemistry • 2020",
      url: "https://www.esaral.com/media/uploads/2023/9/25/153545-07%20jan%20shift%2001-Chemistry-v1.pdf"
    },
    {
      id: "2",
      title: "07 Jan Shift 01 - Physics v3 (2020)",
      subtitle: "Physics • 2020",
      url: "https://www.esaral.com/media/uploads/2023/9/25/15279-07%20jan%20shift%2001-Physics-v3-Image.pdf"
    },
    {
      id: "3",
      title: "07 Jan Shift 01 - Mathematics v4 (2020)",
      subtitle: "Mathematics • 2020",
      url: "https://www.esaral.com/media/uploads/2023/9/25/15178-07%20jan%20shift%2001-Mathematics-v4.pdf"
    },
    {
      id: "4",
      title: "Chemistry Paper With Solution Morning (2021)",
      subtitle: "Chemistry • 2021",
      url: "https://www.esaral.com/media/uploads/2023/9/27/15650-2402-Chemistry-Paper-With-Ans-Solution-Morning.pdf"
    },
    {
      id: "5",
      title: "Physics Paper With Solution Morning (2021)",
      subtitle: "Physics • 2021",
      url: "https://www.esaral.com/media/uploads/2023/9/27/1503-2402-Physics-Paper-With-Ans-Solution-Morning.pdf"
    },
    {
      id: "6",
      title: "Mathematics Paper With Solution Morning (2021)",
      subtitle: "Mathematics • 2021",
      url: "https://www.esaral.com/media/uploads/2023/9/27/15353-2402-Mathematics-Paper-With-Solution-Morning.pdf"
    },
    {
      id: "7",
      title: "25-06 Morning Physics (2022)",
      subtitle: "Physics • 2022", 
      url: "https://www.esaral.com/media/uploads/2023/9/25/13236-25-06%20MORNING%20PHYSICS%202022.pdf"
    },
    {
      id: "8",
      title: "25-06 Morning Chemistry (2022)",
      subtitle: "Chemistry • 2022",
      url: "https://www.esaral.com/media/uploads/2023/9/25/15218-25-06%20MORNING%20CHEMISTRY%202022.pdf"
    },
    {
      id: "9",
      title: "25-06 Morning Maths (2022)", 
      subtitle: "Mathematics • 2022",
      url: "https://www.esaral.com/media/uploads/2023/9/25/145248-25-06%20MORNING%20MATHS%202022%20(1).pdf"
    },
    {
      id: "10",
      title: "24-01-2023 Chemistry Paper With Answer Morning",
      subtitle: "Chemistry • 2023",
      url: "https://www.esaral.com/media/uploads/2023/9/21/15500-24-01-2023_Chemistry_Paper+With+Answer_Morning.pdf"
    },
    {
      id: "11",
      title: "24-01-2023 Physics Paper With Answer Morning",
      subtitle: "Physics • 2023",
      url: "https://www.esaral.com/media/uploads/2023/9/21/153212-24-01-2023_Physics_Paper+With+Ans_Morning.pdf"
    },
    {
      id: "12",
      title: "24-01-2023 Mathematics Paper With Answer Morning",
      subtitle: "Mathematics • 2023",
      url: "https://www.esaral.com/media/uploads/2023/9/21/152040-24-01-23_Mathematicss_Paper+With+Answer_Morning.pdf"
    }
  ]);

  const filteredNotes = notes.filter(note => 
    note.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    note.subtitle.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <>
      {selectedPaper ? (
        <PDFViewer 
          url={selectedPaper.url}
          title={selectedPaper.title}
          onBack={() => setSelectedPaper(null)}
        />
      ) : (
        <div className="container mx-auto px-4 py-6 min-h-screen bg-gradient-to-b from-background to-muted/20">
          {/* Header */}
          <div className="mb-8">
            <Card className="p-4">
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <div className="flex items-center gap-4">
                  <img 
                    src="https://www.pngplay.com/wp-content/uploads/7/Note-Logo-Transparent-Background.png" 
                    alt="Logo" 
                    className="w-14 h-14 rounded-lg object-cover"
                  />
                  <div>
                    <h1 className="text-xl font-bold m-0">JEE Papers</h1>
                    <p className="text-sm text-muted-foreground m-0">Study Materials & Past Papers</p>
                  </div>
                </div>

                {/* Search Bar */}
                <div className="flex-1 max-w-xl flex items-center gap-2">
                  <div className="relative flex-1">
                    <Input
                      type="text"
                      placeholder="Search papers..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  </div>
                  {searchQuery && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setSearchQuery("")}
                      className="text-muted-foreground"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          </div>

          {/* Notes Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredNotes.map(note => (
              <div
                key={note.id}
                onClick={() => setSelectedPaper(note)}
                className="cursor-pointer"
              >
                <Card className="p-3 flex items-center gap-3 hover:shadow-lg transition-all duration-200 hover:-translate-y-1">
                  <div className="w-16 h-16 rounded-lg bg-gradient-to-b from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900 flex items-center justify-center flex-shrink-0 border border-border">
                    <FileText className="w-8 h-8 text-primary/80" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-card-foreground">{note.title}</h3>
                    <p className="text-sm text-muted-foreground mt-1">{note.subtitle}</p>
                  </div>
                </Card>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}

// Add PDF viewer component if needed in the future
