import { useState, useEffect } from 'react';
import { Search, ArrowLeft } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

interface Chapter {
  title: string;
  url: string;
  image: string;
}

const scienceChapters: Chapter[] = [
  { title: "Ch 1: Chemical Reactions and Equations", url: "https://www.selfstudys.com/sitepdfs/4xuhXNgxNXEtl2wqDzwd", image: "https://www.sciencemotive.com/wp-content/uploads/2020/09/science_topic_31-2.jpg" },
  { title: "Ch 2: Acids, Bases and Salts", url: "https://www.selfstudys.com/sitepdfs/NLawg9VXLr8UDnPvb9k0", image: "https://static.vecteezy.com/system/resources/previews/024/449/500/non_2x/art-of-chemistry-of-laboratory-chemical-generative-ai-free-photo.jpg" },
  { title: "Ch 3: Metals and Non-Metals", url: "https://www.selfstudys.com/sitepdfs/xLbBlBNVMKtAiUYWdzrQ", image: "https://www.thoughtco.com/thmb/N5K6SWuDj82JZXIiIDE9nTMp5xI=/750x0/filters:no_upscale():max_bytes(150000):strip_icc():format(webp)/GettyImages-184897119-565d424fac5a496f99c0ef29d47adf98.jpg" },
  { title: "Ch 4: Carbons and its Compounds", url: "https://www.selfstudys.com/sitepdfs/zmM7rICmLStBjEB4pjXg", image: "https://resorcio.com/_next/image?url=https%3A%2F%2Fd1xuqjt1wg0fxw.cloudfront.net%2F25d27280-42b7-11ec-8f1c-dd6d2f069ed8.jpg&w=512&q=75" },
  { title: "Ch 5: Periodic Classification of Elements", url: "https://www.selfstudys.com/sitepdfs/qeaww6vkdczJKOvPoehN", image: "https://www.vijesti.me/data/images/2019/02/18/003322334_20190218200248_5c6b0ca9b789684ea0ff29aajpeg_ls-s.jpg" },
  { title: "Ch 6: Life Process", url: "https://www.selfstudys.com/sitepdfs/1f6D0lf5QEdJX7V3wmiI", image: "https://media.istockphoto.com/id/1126962479/photo/hand-watering-young-plants-in-growing.jpg?s=612x612&w=0&k=20&c=FSep2mD1PAtnsVHv3xQ1OGmTR0NLiqcmKK18Xw2iAj8=" },
  { title: "Ch 7: Controls and Coordination", url: "https://www.selfstudys.com/sitepdfs/63EvwJgB5FU03W0wSdjc", image: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSNF3G3GNas6-WIZy8KJWqiMrYFtgia9ATIQQ&s" },
  { title: "Ch 8: How do Organisms Reproduce", url: "https://www.selfstudys.com/sitepdfs/Nm4lqrm2VPxunPAgeJFH", image: "https://images.unsplash.com/photo-1517048676732-d65bc937f952?q=80&w=1200&auto=format&fit=crop" },
  { title: "Ch 9: Heredity and Evolutions", url: "https://www.selfstudys.com/sitepdfs/K3LeraKOWpigkyFVV9e3", image: "https://www.biologyonline.com/wp-content/uploads/2020/02/Genetics-and-Evolution.jpg" },
  { title: "Ch 10: Light - Reflection and Refraction", url: "https://www.selfstudys.com/sitepdfs/rXhUamRjfbeE6Z0xzv9c", image: "https://media.wired.com/photos/5932b633aef9a462de98465b/3:2/w_2560%2Cc_limit/image.jpg" },
  { title: "Ch 11: Human Eye and Colourful World", url: "https://www.selfstudys.com/sitepdfs/MYO1os6bEWFlHRQyxyuc", image: "https://images.stockcake.com/public/3/3/2/33292ef6-d8ea-466b-b2fc-65f6ab021d56_large/world-in-eye-stockcake.jpg" },
  { title: "Ch 12: Electricity", url: "https://www.selfstudys.com/sitepdfs/mqOMjia19Zo0634QTmpg", image: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQwuc6vCckGWUbuH9xmaWhv3Sxr7EJmbsL-RQ&s" },
  { title: "Ch 13: Magnetic Effect of Electric Current", url: "https://www.selfstudys.com/sitepdfs/kpFKFGY58pKJRdddHaPK", image: "https://temp-public-img-folder.s3.amazonaws.com/sathee.prutor.images/sathee_image/cropped_2024_01_16_d26b4cee5ee421d34515g-208_jpg_height_393_width_458_top_left_y_972_top_left_x_1210.jpg" },
  { title: "Ch 14: Sources of Energy", url: "https://www.selfstudys.com/sitepdfs/jI1qmSZ1dhqiEniem4Fh", image: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTKrJtA2CNNPNgYa1tW-EZ8WNQvT4a0TRS9tyyXeTPC25eI2EmbDwNgOUb0w_NFCXTyRUQ&usqp=CAU" },
  { title: "Ch 15: Our Environment", url: "https://www.selfstudys.com/sitepdfs/GYNkYIcuqWR3pbBhyhrH", image: "https://miro.medium.com/v2/resize:fit:1400/1*_nlTYfyrnBdp_hjvwWmnEQ.jpeg" },
  { title: "Ch 16: Management of Natural Resources", url: "https://www.selfstudys.com/sitepdfs/hoVFIvAebiLrRQHVAIce", image: "https://www.shutterstock.com/image-photo/natural-resources-environment-economy-finance-260nw-289298087.jpg" }
];

const mathChapters: Chapter[] = [
  { title: "Ch 1: Real Numbers", url: "https://www.selfstudys.com/sitepdfs/2BUZ7TnibQ0d0F3oa3F8", image: "https://cdn.britannica.com/41/191041-050-4C0E4F48/bunch-numbers.jpg" },
  { title: "Ch 2: Polynomials", url: "https://www.selfstudys.com/sitepdfs/rYyATXS69PiAfO3RwXst", image: "https://www.thoughtco.com/thmb/-s_ZNbCesdNjxmwQvkx4flMaicM=/1500x0/filters:no_upscale():max_bytes(150000):strip_icc()/Polynomial-thumbnail-56cca2f53df78cfb37a201cc.jpg" },
  { title: "Ch 3: Pair of Linear Equation in Two Variables", url: "https://www.selfstudys.com/sitepdfs/zmPLYk334Jm9QYNUKz03", image: "https://media.geeksforgeeks.org/wp-content/uploads/20230311155033/Linear-Equation-4.png" },
  { title: "Ch 4: Quadratic Equation", url: "https://www.selfstudys.com/sitepdfs/j31WdhCS6iFcmvBFX2HM", image: "https://c8.alamy.com/comp/BAECDB/a-quadratic-equation-written-by-a-student-as-a-study-aid-richard-b-BAECDB.jpg" },
  { title: "Ch 5: Arithmetic Progressions", url: "https://www.selfstudys.com/sitepdfs/mTw3E0oouEUrqwxNWnsE", image: "https://www.shutterstock.com/image-photo/sequential-chain-blocks-plus-one-600nw-2281467399.jpg" },
  { title: "Ch 6: Triangles", url: "https://www.selfstudys.com/sitepdfs/CbETWU8mmlDAk00V8XSv", image: "https://static.vecteezy.com/system/resources/previews/043/828/243/non_2x/seamless-pattern-of-chalk-geometric-triangle-and-theory-formula-doodle-math-blackboard-handwritten-white-chalked-geometry-signs-and-equations-on-green-school-chalkboard-background-vector.jpg" },
  { title: "Ch 7: Co-ordinate Geometry", url: "https://www.selfstudys.com/sitepdfs/kGxNmtgh8Id78v1fOavm", image: "https://robomateplus.com/wp-content/uploads/2017/04/banner7-1.jpg" },
  { title: "Ch 8: Introduction to Trigonometry", url: "https://www.selfstudys.com/sitepdfs/UhypZwJEBmKL8XWZxrYn", image: "https://www.sciencing.com/img/gallery/how-to-use-a-calculator-for-trigonometry-upgrade/using-reciprocals-and-secondary-functions-1741287246.jpg" },
  { title: "Ch 9: Some Applications of Trigonometry", url: "https://www.selfstudys.com/sitepdfs/cWLss0mjqSIYKADga4x0", image: "https://media.geeksforgeeks.org/wp-content/cdn-uploads/20201028203914/tan-2-1024x605.png" },
  { title: "Ch 10: Circles", url: "https://www.selfstudys.com/sitepdfs/z3edXfbrMBseDIUygPLo", image: "https://media.istockphoto.com/id/1266813235/photo/mathematical-constant-pi-letter.jpg?s=612x612&w=0&k=20&c=uaYNsYo4fyci7o-3WD7fiMN173g0o8Q93JxFt3BKpxk=" },
  { title: "Ch 11: Constructions", url: "https://www.selfstudys.com/sitepdfs/MvE8LlDc9s8BgfBj0l64", image: "https://robomateplus.com/wp-content/uploads/2017/05/banner11.jpg" },
  { title: "Ch 12: Area Related to Circles", url: "https://www.selfstudys.com/sitepdfs/MTt9G6Q50eD8a2IG3Nuy", image: "https://robomateplus.com/wp-content/uploads/2017/05/banner12.jpg" },
  { title: "Ch 13: Surface Areas and Volumes", url: "https://www.selfstudys.com/sitepdfs/FyGOM0m7g7jaj0R0nqUm", image: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRiUzWRKdv80hhP3wil4Wvw1NVwrmNL9pVLKvJPLak57eQv_26KT_j0-lLHIhod2nlX85I&usqp=CAU" },
  { title: "Ch 14: Statistics", url: "https://www.selfstudys.com/sitepdfs/w3DrkpfuUMzxal2TDnTG", image: "https://www.mtu.edu/globalcampus/programs/degrees/applied-statistics/articles/importanceofstats/images/screenshot-14-vertical1200.jpg" },
  { title: "Ch 15: Probability", url: "https://www.selfstudys.com/sitepdfs/Icuf2AZ4a5kRECqBvbwz", image: "https://www.euroschoolindia.com/blogs/wp-content/uploads/2023/12/probability-concepts-jpg.webp" }
];

interface ChapterCardProps {
  chapter: Chapter;
  isActive: boolean;
  onClick: () => void;
}

const ChapterCard = ({ chapter, isActive, onClick }: ChapterCardProps) => (
  <div
    className={`
      relative min-h-[120px] p-4 rounded-lg cursor-pointer transition-all duration-200
      bg-cover bg-center overflow-hidden group hover-lift
      ${isActive ? 'ring-2 ring-primary shadow-soft' : ''}
    `}
    style={{ backgroundImage: `url('${chapter.image}')` }}
    onClick={onClick}
  >
    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />
    <div className="relative z-10 flex items-end h-full">
      <span className="text-white font-medium text-sm text-shadow-md leading-snug">
        {chapter.title}
      </span>
    </div>
  </div>
);

interface PDFViewerProps {
  url: string;
  title: string;
  onBack: () => void;
}

const PDFViewer = ({ url, title, onBack }: PDFViewerProps) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (loading) {
        setLoading(false);
        setError(true);
      }
    }, 5000);

    return () => clearTimeout(timer);
  }, [loading]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onBack();
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onBack]);

  return (
    <div className="flex flex-col h-screen bg-background">
      <div className="bg-gradient-primary text-white p-4 flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={onBack} className="text-white hover:bg-white/20">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <h1 className="text-lg font-semibold">{title}</h1>
      </div>

      <div className="flex-1 relative bg-card">
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-muted-foreground text-lg">Loading PDF...</div>
          </div>
        )}

        {error && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center p-6">
              <h3 className="text-xl font-semibold text-destructive mb-2">Unable to load PDF</h3>
              <p className="text-muted-foreground mb-4">
                The PDF preview may be blocked by the website's security settings.
              </p>
              <Button onClick={onBack} variant="outline">
                Go Back
              </Button>
            </div>
          </div>
        )}

        <iframe
          src={url}
          title="PDF Viewer"
          className="absolute inset-0 w-full h-full border-0"
          onLoad={() => {
            setLoading(false);
            setError(false);
          }}
          onError={() => {
            setLoading(false);
            setError(true);
          }}
        />
      </div>
    </div>
  );
};

const Notes = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeChapter, setActiveChapter] = useState<string | null>(null);
  const [viewerData, setViewerData] = useState<{ url: string; title: string } | null>(null);

  const allChapters = [...scienceChapters, ...mathChapters];
  
  const filteredScienceChapters = scienceChapters.filter(chapter =>
    chapter.title.toLowerCase().includes(searchQuery.toLowerCase())
  );
  
  const filteredMathChapters = mathChapters.filter(chapter =>
    chapter.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleChapterClick = (chapter: Chapter) => {
    setActiveChapter(chapter.title);
    setViewerData({ url: chapter.url, title: chapter.title });
  };

  const handleBackToNotes = () => {
    setViewerData(null);
    setActiveChapter(null);
  };

  if (viewerData) {
    return (
      <PDFViewer
        url={viewerData.url}
        title={viewerData.title}
        onBack={handleBackToNotes}
      />
    );
  }

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Header */}
      <div className="bg-gradient-primary text-white p-4">
        <div className="flex flex-col lg:flex-row lg:items-center gap-4">
          <h1 className="text-xl font-bold">Class 10 Science & Math Notes</h1>
          <div className="flex-1 max-w-md">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-white/70" />
              <Input
                type="text"
                placeholder="Search chapters..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-white/20 border-white/30 text-white placeholder:text-white/70 focus:bg-white/30"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6 space-y-8">
        {/* Science Section */}
        {filteredScienceChapters.length > 0 && (
          <section className="animate-fade-in">
            <h2 className="text-2xl font-bold mb-4 text-foreground">Science</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredScienceChapters.map((chapter) => (
                <ChapterCard
                  key={chapter.title}
                  chapter={chapter}
                  isActive={activeChapter === chapter.title}
                  onClick={() => handleChapterClick(chapter)}
                />
              ))}
            </div>
          </section>
        )}

        {/* Math Section */}
        {filteredMathChapters.length > 0 && (
          <section className="animate-fade-in">
            <h2 className="text-2xl font-bold mb-4 text-foreground">Mathematics</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredMathChapters.map((chapter) => (
                <ChapterCard
                  key={chapter.title}
                  chapter={chapter}
                  isActive={activeChapter === chapter.title}
                  onClick={() => handleChapterClick(chapter)}
                />
              ))}
            </div>
          </section>
        )}

        {/* No Results */}
        {searchQuery && filteredScienceChapters.length === 0 && filteredMathChapters.length === 0 && (
          <div className="text-center py-12">
            <Search className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">No chapters found</h3>
            <p className="text-muted-foreground">
              Try adjusting your search term to find the chapters you're looking for.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Notes;