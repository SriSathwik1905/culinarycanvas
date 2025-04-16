
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface ChefFilterProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  sortBy: "newest" | "recipe_count" | "alphabetical";
  setSortBy: (sort: "newest" | "recipe_count" | "alphabetical") => void;
}

export const ChefFilter = ({ 
  searchQuery, 
  setSearchQuery, 
  sortBy, 
  setSortBy 
}: ChefFilterProps) => {
  return (
    <section className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <Input
          placeholder="Search chefs..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>
      <div className="w-full sm:w-48">
        <Select 
          value={sortBy}
          onValueChange={(value) => setSortBy(value as typeof sortBy)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="recipe_count">Most Recipes</SelectItem>
            <SelectItem value="newest">Newest</SelectItem>
            <SelectItem value="alphabetical">A-Z</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </section>
  );
};

export default ChefFilter;
