
import { Search } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { useNavigate } from "react-router-dom";
import { Profile } from "@/types/profile";
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuList,
  NavigationMenuTrigger,
} from "@/components/ui/navigation-menu";

interface ChefSearchDropdownProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  searchResults: Profile[];
  isLoading: boolean;
}

export const ChefSearchDropdown = ({ 
  searchQuery, 
  setSearchQuery, 
  searchResults, 
  isLoading 
}: ChefSearchDropdownProps) => {
  const navigate = useNavigate();

  return (
    <NavigationMenu>
      <NavigationMenuList>
        <NavigationMenuItem>
          <NavigationMenuTrigger className="bg-white">
            <Search className="mr-2 h-4 w-4" />
            Find Chefs
          </NavigationMenuTrigger>
          <NavigationMenuContent className="w-80">
            <div className="p-4">
              <Input
                placeholder="Search chefs by name..."
                className="mb-2"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                autoFocus
              />
              <ScrollArea className="h-72">
                {isLoading ? (
                  <div className="p-4 text-center text-sm">Searching...</div>
                ) : searchResults.length === 0 ? (
                  <div className="p-4 text-center text-sm text-gray-500">
                    {searchQuery ? "No chefs found" : "Type to search for chefs"}
                  </div>
                ) : (
                  <div className="space-y-2 p-2">
                    {searchResults.map((chef) => (
                      <div 
                        key={chef.id} 
                        className="flex cursor-pointer items-center gap-3 rounded-md p-2 hover:bg-gray-100"
                        onClick={() => navigate(`/chefs/${chef.id}`)}
                      >
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={chef.avatar_url || ""} alt={chef.username || ""} />
                          <AvatarFallback className="bg-sage text-white">
                            {chef.username?.[0] || "C"}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{chef.username}</p>
                          {chef.bio && (
                            <p className="text-xs text-gray-500 line-clamp-1">
                              {chef.bio}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </div>
          </NavigationMenuContent>
        </NavigationMenuItem>
      </NavigationMenuList>
    </NavigationMenu>
  );
};

export default ChefSearchDropdown;
