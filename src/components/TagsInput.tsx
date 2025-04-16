
import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PlusCircle, X, Tag as TagIcon } from "lucide-react";
import { Tag } from "@/types/recipe";
import { fetchTags, createTag } from "@/integrations/supabase/utils";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface TagsInputProps {
  selectedTags: Tag[];
  onTagsChange: (tags: Tag[]) => void;
  placeholder?: string;
}

export const TagsInput = ({ selectedTags, onTagsChange, placeholder = "Add tags..." }: TagsInputProps) => {
  const [open, setOpen] = useState(false);
  const [availableTags, setAvailableTags] = useState<Tag[]>([]);
  const [searchValue, setSearchValue] = useState("");
  const [newTagName, setNewTagName] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const getTags = async () => {
      setIsLoading(true);
      try {
        const tags = await fetchTags();
        setAvailableTags(tags);
      } catch (err) {
        console.error("Error fetching tags:", err);
      } finally {
        setIsLoading(false);
      }
    };

    getTags();
  }, []);

  const handleCreateTag = async () => {
    if (!newTagName.trim()) return;
    
    // Check if tag already exists
    const matchingTag = availableTags.find(
      tag => tag.name.toLowerCase() === newTagName.trim().toLowerCase()
    );
    
    if (matchingTag) {
      if (!selectedTags.some(tag => tag.id === matchingTag.id)) {
        onTagsChange([...selectedTags, matchingTag]);
      }
      setNewTagName("");
      return;
    }
    
    setIsLoading(true);
    try {
      const newTag = await createTag(newTagName);
      if (newTag) {
        setAvailableTags(prev => [...prev, newTag]);
        onTagsChange([...selectedTags, newTag]);
        setNewTagName("");
      }
    } catch (err) {
      console.error("Error creating tag:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const selectTag = (tag: Tag) => {
    if (!selectedTags.some(t => t.id === tag.id)) {
      onTagsChange([...selectedTags, tag]);
    }
    setOpen(false);
  };

  const removeTag = (tagId: string) => {
    onTagsChange(selectedTags.filter(tag => tag.id !== tagId));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && newTagName) {
      e.preventDefault();
      handleCreateTag();
    }
    
    if (e.key === ',') {
      e.preventDefault();
      if (newTagName) handleCreateTag();
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-col gap-2">
        <div className="flex gap-2">
          <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
              <Button 
                variant="outline" 
                role="combobox" 
                aria-expanded={open} 
                className="justify-between"
              >
                <TagIcon className="mr-2 h-4 w-4" />
                {placeholder}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[200px] p-0" align="start">
              <Command>
                <CommandInput 
                  placeholder="Search tags..." 
                  value={searchValue}
                  onValueChange={setSearchValue}
                />
                <CommandList>
                  <CommandEmpty>
                    {searchValue ? (
                      <div className="px-2 py-1.5">
                        <p>No tags found</p>
                        <Button
                          variant="outline"
                          size="sm"
                          className="mt-2 w-full"
                          onClick={() => {
                            setNewTagName(searchValue);
                            setOpen(false);
                          }}
                        >
                          Create tag "{searchValue}"
                        </Button>
                      </div>
                    ) : (
                      "No tags found"
                    )}
                  </CommandEmpty>
                  <CommandGroup>
                    {availableTags
                      .filter(tag => 
                        !selectedTags.some(t => t.id === tag.id) && 
                        tag.name.toLowerCase().includes(searchValue.toLowerCase())
                      )
                      .map(tag => (
                        <CommandItem 
                          key={tag.id} 
                          value={tag.name}
                          onSelect={() => selectTag(tag)}
                        >
                          <TagIcon className="mr-2 h-3 w-3" />
                          {tag.name}
                        </CommandItem>
                      ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
          
          <div className="flex flex-1 gap-2">
            <Input
              placeholder="Create a new tag (separate by comma or Enter)"
              value={newTagName}
              onChange={(e) => setNewTagName(e.target.value)}
              onKeyDown={handleKeyDown}
              className="flex-1"
            />
            <Button 
              type="button" 
              onClick={handleCreateTag}
              disabled={!newTagName.trim() || isLoading}
            >
              <PlusCircle className="h-4 w-4" />
            </Button>
          </div>
        </div>
        
        <div className="flex flex-wrap gap-2 mt-2">
          {selectedTags.length === 0 ? (
            <div className="text-sm text-gray-500 italic">No tags selected</div>
          ) : (
            selectedTags.map((tag) => (
              <Badge key={tag.id} className="flex items-center gap-1 bg-sage text-white">
                {tag.name}
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-5 w-5 p-0 hover:bg-transparent hover:text-white"
                  onClick={() => removeTag(tag.id)}
                >
                  <X className="h-3 w-3" />
                </Button>
              </Badge>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
