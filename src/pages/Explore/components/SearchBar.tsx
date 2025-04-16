
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { X, Filter, Search, ChevronDown, Plus } from "lucide-react";
import { Tag } from "@/types/recipe";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface SearchBarProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  selectedTags: Tag[];
  setSelectedTags: (tags: Tag[]) => void;
  ingredients: string[];
  setIngredients: (ingredients: string[]) => void;
  showTagsPanel: boolean;
  setShowTagsPanel: (show: boolean) => void;
  handleSearch: () => void;
}

export const SearchBar = ({
  searchQuery,
  setSearchQuery,
  selectedTags,
  setSelectedTags,
  ingredients,
  setIngredients,
  showTagsPanel,
  setShowTagsPanel,
  handleSearch,
}: SearchBarProps) => {
  const [newIngredient, setNewIngredient] = useState("");
  const [quantity, setQuantity] = useState("");
  const [unit, setUnit] = useState("grams");

  const handleRemoveTag = (tagId: string) => {
    setSelectedTags(selectedTags.filter((tag) => tag.id !== tagId));
  };

  const handleRemoveIngredient = (index: number) => {
    const updatedIngredients = [...ingredients];
    updatedIngredients.splice(index, 1);
    setIngredients(updatedIngredients);
  };

  const handleAddIngredient = () => {
    if (newIngredient.trim()) {
      const formattedIngredient = quantity 
        ? `${newIngredient.trim()} (${quantity} ${unit})`
        : newIngredient.trim();
      
      setIngredients([...ingredients, formattedIngredient]);
      setNewIngredient("");
      setQuantity("");
      setUnit("grams");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleAddIngredient();
    }
  };

  const units = [
    "grams",
    "kg",
    "oz",
    "lbs",
    "cups",
    "tbsp",
    "tsp",
    "ml",
    "l",
    "pinch",
    "piece(s)"
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row gap-2">
        <div className="relative flex-1">
          <Input
            type="text"
            placeholder="Search recipes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pr-10"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                handleSearch();
              }
            }}
          />
          <Button 
            variant="ghost" 
            size="icon" 
            className="absolute right-2 top-1/2 -translate-y-1/2"
            onClick={handleSearch}
          >
            <Search className="h-4 w-4" />
          </Button>
        </div>
        <Button
          onClick={handleSearch}
          className="bg-sage hover:bg-sage/90"
        >
          Search
        </Button>
      </div>

      {/* Tags and Ingredients Section */}
      <div className="flex flex-wrap gap-2 mt-2">
        {selectedTags.map((tag) => (
          <Badge key={tag.id} className="bg-sage py-1">
            {tag.name}
            <button
              onClick={() => handleRemoveTag(tag.id)}
              className="ml-2 focus:outline-none"
            >
              <X className="h-3 w-3" />
            </button>
          </Badge>
        ))}

        {ingredients.map((ingredient, index) => (
          <Badge key={index} className="bg-amber-600 py-1">
            {ingredient}
            <button
              onClick={() => handleRemoveIngredient(index)}
              className="ml-2 focus:outline-none"
            >
              <X className="h-3 w-3" />
            </button>
          </Badge>
        ))}

        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="h-7">
              <Plus className="mr-1 h-3 w-3" /> Add Ingredient
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80">
            <div className="space-y-2">
              <Input
                placeholder="Ingredient name"
                value={newIngredient}
                onChange={(e) => setNewIngredient(e.target.value)}
                onKeyDown={handleKeyDown}
              />
              <div className="flex gap-2">
                <Input
                  placeholder="Quantity"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  type="text"
                  className="w-1/3"
                />
                <Select value={unit} onValueChange={setUnit}>
                  <SelectTrigger className="w-2/3">
                    <SelectValue placeholder="Unit" />
                  </SelectTrigger>
                  <SelectContent>
                    {units.map((u) => (
                      <SelectItem key={u} value={u}>
                        {u}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={handleAddIngredient} className="w-full">
                Add
              </Button>
            </div>
          </PopoverContent>
        </Popover>

        <Button
          variant="outline"
          onClick={() => setShowTagsPanel(!showTagsPanel)}
          size="sm"
          className="h-7"
        >
          <Filter className="mr-1 h-3 w-3" /> {showTagsPanel ? "Hide Tags" : "Show Tags"}
        </Button>
      </div>
    </div>
  );
};
