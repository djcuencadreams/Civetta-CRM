import { cn } from "@/lib/utils";
import { t } from "@/lib/i18n";
import { Link, useLocation } from "wouter";
import {
  LayoutDashboard,
  Users,
  ShoppingBag,
  Settings,
  Menu
} from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";

const navigation = [
  {
    title: t("common.dashboard"),
    href: "/",
    icon: LayoutDashboard
  },
  {
    title: t("common.customers"),
    href: "/customers",
    icon: Users
  },
  {
    title: t("common.sales"),
    href: "/sales",
    icon: ShoppingBag
  },
  {
    title: t("common.integrations"),
    href: "/integrations",
    icon: Settings
  }
];

export function Sidebar({ className }: { className?: string }) {
  const [location] = useLocation();

  const SidebarContent = (
    <div className="flex h-full flex-col gap-4">
      <div className="px-6 py-4 border-b">
        <h2 className="text-2xl font-bold">CRM Moda</h2>
      </div>
      <div className="flex-1 px-4">
        <nav className="flex flex-col gap-2">
          {navigation.map((item) => {
            const isActive = location === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-muted"
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.title}
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );

  return (
    <>
      <aside
        className={cn(
          "w-64 border-r bg-card text-card-foreground",
          className
        )}
      >
        {SidebarContent}
      </aside>

      {/* Mobile Menu */}
      <Sheet>
        <SheetTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden fixed top-4 left-4"
          >
            <Menu className="h-6 w-6" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-64 p-0">
          {SidebarContent}
        </SheetContent>
      </Sheet>
    </>
  );
}