import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ReportCategory } from "@/lib/reportConfig"; // Import interfaces from new config file

interface ReportSidebarProps {
  reportCategories: ReportCategory[]; // Now passed as a prop
}

const ReportSidebar: React.FC<ReportSidebarProps> = ({ reportCategories }) => {
  const location = useLocation();
  const activeReportId = location.hash.replace("#", "");

  return (
    <ScrollArea className="h-full py-4 pr-4">
      <nav className="space-y-6">
        {reportCategories.map((category) => (
          <div key={category.title}>
            <h3 className="mb-2 flex items-center gap-2 px-3 text-sm font-semibold text-muted-foreground">
              <category.icon className="h-4 w-4" /> {category.title}
            </h3>
            <div className="space-y-1">
              {category.reports.map((report) => (
                <Link
                  key={report.id}
                  to={`/reports#${report.id}`}
                  className={cn(
                    "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-muted/50",
                    activeReportId === report.id ? "bg-muted text-primary" : "text-foreground"
                  )}
                >
                  <report.icon className="h-4 w-4" />
                  {report.title}
                </Link>
              ))}
            </div>
          </div>
        ))}
      </nav>
    </ScrollArea>
  );
};

export default ReportSidebar;