import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Profile } from "@/types/profile";
import { ImagePlus } from "lucide-react";
import { Badge } from "@/components/ui/badge";

type ProfileFormProps = {
  initialData?: Profile;
  onSuccess?: () => void;
};

export const ProfileForm = ({ initialData, onSuccess }: ProfileFormProps) => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [username, setUsername] = useState(initialData?.username || "");
  const [bio, setBio] = useState(initialData?.bio || "");
  const [website, setWebsite] = useState(initialData?.website || "");
  const [avatar, setAvatar] = useState<File | null>(null);
  const [avatarUrl, setAvatarUrl] = useState(initialData?.avatar_url || "");
  const [favoritesCuisines, setFavoriteCuisines] = useState(initialData?.favorite_cuisines || []);
  const [currentCuisine, setCurrentCuisine] = useState("");

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setAvatar(e.target.files[0]);
    }
  };

  const uploadImage = async () => {
    if (!avatar) return avatarUrl;

    const fileExt = avatar.name.split('.').pop();
    const fileName = `${crypto.randomUUID()}.${fileExt}`;
    const { error: uploadError, data } = await supabase.storage
      .from('profile-images')
      .upload(fileName, avatar);

    if (uploadError) {
      throw uploadError;
    }

    const { data: { publicUrl } } = supabase.storage
      .from('profile-images')
      .getPublicUrl(fileName);

    return publicUrl;
  };

  const addCuisine = () => {
    if (currentCuisine.trim() === "") return;
    setFavoriteCuisines([...favoritesCuisines, currentCuisine.trim()]);
    setCurrentCuisine("");
  };

  const removeCuisine = (index: number) => {
    const updated = [...favoritesCuisines];
    updated.splice(index, 1);
    setFavoriteCuisines(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        throw new Error("You must be logged in to update your profile");
      }

      let uploadedAvatarUrl = avatarUrl;
      if (avatar) {
        uploadedAvatarUrl = await uploadImage();
      }

      const profileData = {
        username,
        bio,
        website,
        avatar_url: uploadedAvatarUrl,
        favorite_cuisines: favoritesCuisines,
        updated_at: new Date().toISOString()
      };

      const { error } = await supabase
        .from('profiles')
        .upsert({ id: user.id, ...profileData });

      if (error) throw error;
      
      toast.success("Profile updated successfully!");
      onSuccess?.();

    } catch (error: unknown) {
      console.error("Error updating profile:", error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="flex items-center justify-center w-full">
        <label className="flex flex-col items-center justify-center w-full h-64 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100">
          {avatarUrl || avatar ? (
            <div className="w-full h-full relative">
              <img
                src={avatar ? URL.createObjectURL(avatar) : avatarUrl}
                alt="Profile preview"
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
        <Input
          placeholder="Username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          className="w-full"
          required
        />
      </div>

      <div>
        <Textarea
          placeholder="Bio (tell us about yourself)"
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          className="w-full rounded-xl border-2 border-gray-100 bg-gray-50 p-4 focus:border-sage focus:ring-sage"
          rows={4}
        />
      </div>

      <div>
        <Input
          placeholder="Website (optional)"
          value={website}
          onChange={(e) => setWebsite(e.target.value)}
          className="w-full"
        />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Favorite Cuisines</label>
        <div className="flex gap-2">
          <Input
            placeholder="Add a cuisine (e.g., Italian, Japanese)"
            value={currentCuisine}
            onChange={(e) => setCurrentCuisine(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                addCuisine();
              }
            }}
          />
          <Button 
            type="button" 
            onClick={addCuisine}
            size="sm"
          >
            Add
          </Button>
        </div>
        <div className="mt-2 flex flex-wrap gap-2">
          {favoritesCuisines.map((cuisine, index) => (
            <Badge key={index} onClick={() => removeCuisine(index)} className="cursor-pointer">
              {cuisine} ×
            </Badge>
          ))}
        </div>
      </div>

      <Button
        type="submit"
        className="w-full"
        disabled={isLoading}
      >
        {isLoading ? "Saving..." : "Update Profile"}
      </Button>
    </form>
  );
};
