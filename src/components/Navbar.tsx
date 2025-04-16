
import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { ChefHat, Menu, X, LogOut, Home, Search, UserCircle, Users } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export const Navbar = () => {
  const { user, logout } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate("/auth");
  };

  return (
    <header className="fixed left-0 right-0 top-0 z-50 bg-white/80 backdrop-blur-md">
      <div className="container mx-auto flex h-20 items-center justify-between px-4">
        <Link to="/" className="flex items-center gap-2">
          <ChefHat className="h-8 w-8 text-sage" />
          <span className="text-xl font-bold text-gray-900">RecipeHub</span>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden items-center space-x-1 md:flex">
          <Link
            to="/"
            className={`rounded-md px-3 py-2 text-sm font-medium transition-colors ${
              location.pathname === "/"
                ? "bg-sage/10 text-sage"
                : "text-gray-700 hover:bg-sage/10 hover:text-sage"
            }`}
          >
            <Home className="mr-1 inline-block h-4 w-4" />
            Home
          </Link>
          <Link
            to="/explore"
            className={`rounded-md px-3 py-2 text-sm font-medium transition-colors ${
              location.pathname === "/explore"
                ? "bg-sage/10 text-sage"
                : "text-gray-700 hover:bg-sage/10 hover:text-sage"
            }`}
          >
            <Search className="mr-1 inline-block h-4 w-4" />
            Explore
          </Link>
          <Link
            to="/chefs"
            className={`rounded-md px-3 py-2 text-sm font-medium transition-colors ${
              location.pathname === "/chefs" || location.pathname.startsWith("/chefs/")
                ? "bg-sage/10 text-sage"
                : "text-gray-700 hover:bg-sage/10 hover:text-sage"
            }`}
          >
            <Users className="mr-1 inline-block h-4 w-4" />
            Chefs
          </Link>
          <Link to="/recipes/new">
            <Button size="sm" className="ml-2">
              Create Recipe
            </Button>
          </Link>
          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="ml-2 h-9 w-9 rounded-full p-0"
                >
                  <span className="flex h-full w-full items-center justify-center rounded-full bg-sage text-white">
                    {user.username?.[0].toUpperCase() || user.email?.[0].toUpperCase() || "U"}
                  </span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onClick={() => navigate(`/chefs/${user.id}`)}
                  className="cursor-pointer"
                >
                  <UserCircle className="mr-2 h-4 w-4" />
                  My Profile
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => navigate("/profile")}
                  className="cursor-pointer"
                >
                  Your Recipes
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={handleLogout}
                  className="cursor-pointer text-red-600"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Link to="/auth">
              <Button variant="ghost" size="sm" className="ml-2">
                Sign In
              </Button>
            </Link>
          )}
        </nav>

        {/* Mobile Navigation Toggle */}
        <button
          className="text-gray-700 md:hidden"
          onClick={() => setIsMenuOpen(!isMenuOpen)}
        >
          {isMenuOpen ? (
            <X className="h-6 w-6" />
          ) : (
            <Menu className="h-6 w-6" />
          )}
        </button>
      </div>

      {/* Mobile Navigation Menu */}
      {isMenuOpen && (
        <nav className="border-t border-gray-100 bg-white py-4 md:hidden">
          <div className="container mx-auto space-y-2 px-4">
            <Link
              to="/"
              className="block rounded-md px-3 py-2 text-base font-medium text-gray-700 hover:bg-sage/10 hover:text-sage"
              onClick={() => setIsMenuOpen(false)}
            >
              <Home className="mr-2 inline-block h-5 w-5" />
              Home
            </Link>
            <Link
              to="/explore"
              className="block rounded-md px-3 py-2 text-base font-medium text-gray-700 hover:bg-sage/10 hover:text-sage"
              onClick={() => setIsMenuOpen(false)}
            >
              <Search className="mr-2 inline-block h-5 w-5" />
              Explore
            </Link>
            <Link
              to="/chefs"
              className="block rounded-md px-3 py-2 text-base font-medium text-gray-700 hover:bg-sage/10 hover:text-sage"
              onClick={() => setIsMenuOpen(false)}
            >
              <Users className="mr-2 inline-block h-5 w-5" />
              Chefs
            </Link>
            {user && (
              <Link
                to={`/chefs/${user.id}`}
                className="block rounded-md px-3 py-2 text-base font-medium text-gray-700 hover:bg-sage/10 hover:text-sage"
                onClick={() => setIsMenuOpen(false)}
              >
                <UserCircle className="mr-2 inline-block h-5 w-5" />
                My Profile
              </Link>
            )}
            {user && (
              <Link
                to="/profile"
                className="block rounded-md px-3 py-2 text-base font-medium text-gray-700 hover:bg-sage/10 hover:text-sage"
                onClick={() => setIsMenuOpen(false)}
              >
                <ChefHat className="mr-2 inline-block h-5 w-5" />
                Your Recipes
              </Link>
            )}
            <Link
              to="/recipes/new"
              className="block rounded-md px-3 py-2 text-base font-medium text-gray-700 hover:bg-sage/10 hover:text-sage"
              onClick={() => setIsMenuOpen(false)}
            >
              <ChefHat className="mr-2 inline-block h-5 w-5" />
              Create Recipe
            </Link>
            {user ? (
              <button
                onClick={() => {
                  handleLogout();
                  setIsMenuOpen(false);
                }}
                className="block w-full rounded-md px-3 py-2 text-left text-base font-medium text-red-600 hover:bg-red-50"
              >
                <LogOut className="mr-2 inline-block h-5 w-5" />
                Logout
              </button>
            ) : (
              <Link
                to="/auth"
                className="block rounded-md px-3 py-2 text-base font-medium text-gray-700 hover:bg-sage/10 hover:text-sage"
                onClick={() => setIsMenuOpen(false)}
              >
                Sign In
              </Link>
            )}
          </div>
        </nav>
      )}
    </header>
  );
};
