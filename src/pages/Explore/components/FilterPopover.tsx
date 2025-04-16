import { Button } from "@/components/ui/button";
import { SlidersHorizontal, X, Check } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { SortOption } from "../hooks/useRecipesData";
import { Difficulty } from "@/types/recipe";
import { useState } from "react";

interface FilterPopoverProps {
  sortBy: string;
  setSortBy: (sortBy: string) => void;
  filterCuisine: string;
  setFilterCuisine: (cuisine: string) => void;
  filterDifficulty: Difficulty | "";
  setFilterDifficulty: (difficulty: Difficulty | "") => void;
  cuisineOptions: string[];
  resetFilters: () => void;
  showFilters: boolean;
  setShowFilters: (showFilters: boolean) => void;
  sortOptions: SortOption[];
  maxCookTime: number | null;
  setMaxCookTime: (time: number | null) => void;
}

export const FilterPopover = ({
  sortBy,
  setSortBy,
  filterCuisine,
  setFilterCuisine,
  filterDifficulty,
  setFilterDifficulty,
  cuisineOptions,
  resetFilters,
  showFilters,
  setShowFilters,
  sortOptions,
  maxCookTime,
  setMaxCookTime
}: FilterPopoverProps) => {
  const [open, setOpen] = useState(false);
  const [localMaxCookTime, setLocalMaxCookTime] = useState(maxCookTime || 60);

  const activeFiltersCount =
    (filterCuisine ? 1 : 0) +
    (filterDifficulty ? 1 : 0) +
    (maxCookTime !== null ? 1 : 0);

  const handleTimeChange = (values: number[]) => {
    setLocalMaxCookTime(values[0]);
  };

  const applyTimeFilter = () => {
    setMaxCookTime(localMaxCookTime);
  };

  const clearTimeFilter = () => {
    setMaxCookTime(null);
    setLocalMaxCookTime(60);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className="relative flex items-center gap-2"
        >
          <SlidersHorizontal className="h-4 w-4" />
          Filters
          {activeFiltersCount > 0 && (
            <Badge className="ml-1 h-5 w-5 rounded-full p-0 flex items-center justify-center bg-sage text-white">
              {activeFiltersCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[300px] p-4" align="end">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-medium">Filter Options</h4>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 px-2 text-muted-foreground"
              onClick={resetFilters}
            >
              Reset
              <X className="ml-2 h-4 w-4" />
            </Button>
          </div>

          <div className="space-y-2">
            <Label htmlFor="sort">Sort By</Label>
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger id="sort">
                <SelectValue placeholder="Select sort order" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {sortOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="cuisine">Cuisine</Label>
            <Select
              value={filterCuisine}
              onValueChange={setFilterCuisine}
            >
              <SelectTrigger id="cuisine">
                <SelectValue placeholder="Select cuisine" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Cuisines</SelectItem>
                {cuisineOptions.map((cuisine) => (
                  <SelectItem key={cuisine} value={cuisine}>
                    {cuisine}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="difficulty">Difficulty</Label>
            <Select
              value={filterDifficulty}
              onValueChange={(value) => setFilterDifficulty(value as Difficulty | "")}
            >
              <SelectTrigger id="difficulty">
                <SelectValue placeholder="Select difficulty" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Any Difficulty</SelectItem>
                <SelectItem value="easy">Easy</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="hard">Hard</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Max Cook Time</Label>
              <div className="flex items-center gap-2">
                {maxCookTime !== null && (
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={clearTimeFilter} 
                    className="h-6 px-2"
                  >
                    Clear
                  </Button>
                )}
                <span className="text-sm font-medium">{localMaxCookTime} min</span>
              </div>
            </div>
            <Slider
              defaultValue={[localMaxCookTime]}
              max={180}
              step={5}
              onValueChange={handleTimeChange}
              onValueCommit={applyTimeFilter}
              className="py-2"
            />
          </div>

          <Button 
            className="w-full" 
            onClick={() => {
              applyTimeFilter();
              setOpen(false);
            }}
          >
            Apply Filters
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
};
