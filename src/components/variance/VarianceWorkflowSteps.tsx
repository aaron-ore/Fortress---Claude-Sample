import { Link, useLocation } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Upload, Link2, ClipboardList, TrendingDown } from "lucide-react";

const STEPS = [
  { step: 1, title: "Import Sales", href: "/variance/sales-import", icon: Upload },
  { step: 2, title: "Map POS Items", href: "/variance/mapping", icon: Link2 },
  { step: 3, title: "Physical Counts", href: "/variance/counts", icon: ClipboardList },
  { step: 4, title: "Variance Report", href: "/variance", icon: TrendingDown },
];

/**
 * Compact workflow guide shown on every variance page so users always know
 * where they are in the Sales -> Mapping -> Counts -> Report flow.
 */
const VarianceWorkflowSteps: React.FC = () => {
  const { pathname } = useLocation();

  return (
    <Card>
      <CardContent className="py-3 px-4">
        <div className="flex flex-wrap items-center gap-x-1 gap-y-2">
          {STEPS.map(({ step, title, href, icon: Icon }, index) => {
            const isCurrent = pathname === href;
            return (
              <div key={href} className="flex items-center">
                {index > 0 && <span className="mx-1 text-muted-foreground/40 select-none">→</span>}
                <Link
                  to={href}
                  className={cn(
                    "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm transition-colors",
                    isCurrent
                      ? "bg-primary text-primary-foreground font-semibold"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground",
                  )}
                  aria-current={isCurrent ? "step" : undefined}
                >
                  <Icon className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">{step}.</span> {title}
                </Link>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};

export default VarianceWorkflowSteps;
