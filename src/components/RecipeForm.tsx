import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { typedSupabase } from "@/integrations/supabase/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Recipe, Tag } from "@/types/recipe";
import { ImagePlus, PlusCircle, X } from "lucide-react";
import { TagsInput } from "@/components/TagsInput";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type RecipeFormProps = {
  initialData?: Recipe;
  onSuccess?: (recipeId: string) => void;
};

export const RecipeForm = ({ initialData, onSuccess }: RecipeFormProps) => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [title, setTitle] = useState(initialData?.title || "");
  const [description, setDescription] = useState(initialData?.description || "");
  const [instructions, setInstructions] = useState(initialData?.instructions || "");
  const [cookTime, setCookTime] = useState(initialData?.cook_time_minutes?.toString() || "");
  const [prepTime, setPrepTime] = useState(initialData?.prep_time_minutes?.toString() || "");
  const [calories, setCalories] = useState(initialData?.calories?.toString() || "");
  const [servings, setServings] = useState(initialData?.servings?.toString() || "");
  const [cuisine, setCuisine] = useState(initialData?.cuisine || "");
  const [difficulty, setDifficulty] = useState<"easy" | "medium" | "hard">(
    initialData?.difficulty || "medium"
  );
  const [image, setImage] = useState<File | null>(null);
  const [imageUrl, setImageUrl] = useState(initialData?.image_url || "");
  
  const [ingredients, setIngredients] = useState<string[]>(initialData?.ingredients || []);
  const [currentIngredient, setCurrentIngredient] = useState("");
  
  const [tags, setTags] = useState<Tag[]>(initialData?.tags || []);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setImage(e.target.files[0]);
    }
  };

  const uploadImage = async () => {
    if (!image) return null;

    const fileExt = image.name.split('.').pop();
    const fileName = `${crypto.randomUUID()}.${fileExt}`;
    const { error: uploadError, data } = await supabase.storage
      .from('recipe-images')
      .upload(fileName, image);

    if (uploadError) {
      throw uploadError;
    }

    const { data: { publicUrl } } = supabase.storage
      .from('recipe-images')
      .getPublicUrl(fileName);

    return publicUrl;
  };

  const addIngredient = () => {
    if (currentIngredient.trim() === "") return;
    setIngredients([...ingredients, currentIngredient.trim()]);
    setCurrentIngredient("");
  };

  const removeIngredient = (index: number) => {
    const updatedIngredients = [...ingredients];
    updatedIngredients.splice(index, 1);
    setIngredients(updatedIngredients);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        throw new Error("You must be logged in to create a recipe");
      }

      let uploadedImageUrl = imageUrl;
      if (image) {
        uploadedImageUrl = await uploadImage();
      }

      const recipeData = {
        title,
        description,
        instructions,
        ingredients,
        cook_time_minutes: parseInt(cookTime),
        prep_time_minutes: parseInt(prepTime),
        calories: calories ? parseInt(calories) : null,
        servings: parseInt(servings),
        cuisine,
        difficulty,
        user_id: user.id,
        image_url: uploadedImageUrl,
      };

      let recipeId = initialData?.id;

      try {
        if (initialData?.id) {
          const { error } = await typedSupabase.recipes
            .update(recipeData)
            .eq('id', initialData.id)
            .eq('user_id', user.id);

          if (error) throw error;
          toast.success("Recipe updated successfully!");
        } else {
          const { data, error } = await typedSupabase.recipes.insert(recipeData);
          
          if (error) throw error;
          if (data) {
            recipeId = data.id;
          }
          toast.success("Recipe created successfully!");
        }

        if (recipeId) {
          await typedSupabase.recipe_tags.delete()
            .eq("recipe_id", recipeId);
          
          if (tags.length > 0) {
            const tagInserts = tags.map(tag => ({
              recipe_id: recipeId as string,
              tag_id: tag.id
            }));
            
            const { error } = await typedSupabase.recipe_tags.insert(tagInserts);
            
            if (error) {
              console.error("Error associating tags with recipe:", error);
              toast.error("Recipe saved but there was an issue with tags");
            }
          }
        }

        onSuccess?.(recipeId);
        navigate("/profile");
      } catch (err) {
        console.error("Error in recipe operation:", err);
        toast.error("Error saving recipe. Please try again.");
        throw err;
      }
    } catch (error: unknown) {
      console.error("Error saving recipe:", error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <Input
          placeholder="Recipe Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full"
          required
        />
      </div>

      <div className="flex items-center justify-center w-full">
        <label className="flex flex-col items-center justify-center w-full h-64 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100">
          {imageUrl || image ? (
            <div className="w-full h-full relative">
              <img
                src={image ? URL.createObjectURL(image) : imageUrl}
                alt="Recipe preview"
                className="w-full h-full object-cover rounded-lg"
              />
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                <p className="text-white text-sm">Click to change image</p>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center pt-5 pb-6">
              <ImagePlus className="w-8 h-8 mb-4 text-gray-500" />
              <p className="mb-2 text-sm text-gray-500"><span className="font-semibold">Click to upload</span> or drag and drop</p>
              <p className="text-xs text-gray-500">PNG, JPG or GIF (MAX. 800x400px)</p>
            </div>
          )}
          <input
            type="file"
            className="hidden"
            accept="image/*"
            onChange={handleImageChange}
          />
        </label>
      </div>

      <div>
        <textarea
          placeholder="Description (optional)"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="w-full rounded-xl border-2 border-gray-100 bg-gray-50 p-4 focus:border-sage focus:ring-sage"
          rows={3}
        />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Ingredients</label>
        <div className="flex gap-2">
          <Input
            placeholder="Add an ingredient (e.g., 2 cups flour)"
            value={currentIngredient}
            onChange={(e) => setCurrentIngredient(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                addIngredient();
              }
            }}
          />
          <Button 
            type="button" 
            onClick={addIngredient}
            size="icon"
          >
            <PlusCircle className="h-4 w-4" />
          </Button>
        </div>
        <div className="mt-2 space-y-1">
          {ingredients.length === 0 && (
            <div className="text-sm text-gray-500 italic">No ingredients added yet</div>
          )}
          {ingredients.map((ingredient, index) => (
            <div key={index} className="flex items-center justify-between bg-gray-50 p-2 rounded-md">
              <span>{ingredient}</span>
              <Button 
                type="button" 
                variant="ghost" 
                size="sm"
                onClick={() => removeIngredient(index)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      </div>

      <div>
        <textarea
          placeholder="Instructions"
          value={instructions}
          onChange={(e) => setInstructions(e.target.value)}
          className="w-full rounded-xl border-2 border-gray-100 bg-gray-50 p-4 focus:border-sage focus:ring-sage"
          rows={6}
          required
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Input
          type="number"
          placeholder="Cook Time (minutes)"
          value={cookTime}
          onChange={(e) => setCookTime(e.target.value)}
          required
        />
        <Input
          type="number"
          placeholder="Prep Time (minutes)"
          value={prepTime}
          onChange={(e) => setPrepTime(e.target.value)}
          required
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Input
          type="number"
          placeholder="Calories (optional)"
          value={calories}
          onChange={(e) => setCalories(e.target.value)}
        />
        <Input
          type="number"
          placeholder="Servings"
          value={servings}
          onChange={(e) => setServings(e.target.value)}
          required
        />
      </div>

      <div>
        <Input
          placeholder="Cuisine (e.g., Italian, Japanese, etc.)"
          value={cuisine}
          onChange={(e) => setCuisine(e.target.value)}
          required
        />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Tags</label>
        <TagsInput 
          selectedTags={tags}
          onTagsChange={setTags}
          placeholder="Add recipe tags..."
        />
      </div>

      <Select value={difficulty} onValueChange={(value: "easy" | "medium" | "hard") => setDifficulty(value)}>
        <SelectTrigger>
          <SelectValue placeholder="Select difficulty" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="easy">Easy</SelectItem>
          <SelectItem value="medium">Medium</SelectItem>
          <SelectItem value="hard">Hard</SelectItem>
        </SelectContent>
      </Select>

      <Button
        type="submit"
        className="w-full"
        disabled={isLoading}
      >
        {isLoading
          ? "Saving..."
          : initialData
          ? "Update Recipe"
          : "Create Recipe"}
      </Button>
    </form>
  );
};
