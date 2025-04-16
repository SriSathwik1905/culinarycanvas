
import { Profile } from "@/types/profile";
import ChefCard from "@/components/chef/ChefCard";

interface FeaturedChefsProps {
  featuredChefs: (Profile & { recipe_count?: number; follower_count?: number })[];
}

export const FeaturedChefs = ({ featuredChefs }: FeaturedChefsProps) => {
  if (featuredChefs.length === 0) return null;
  
  return (
    <section className="mb-12">
      <h2 className="mb-6 text-2xl font-semibold text-gray-900">
        Featured Chefs
      </h2>
      <div className="grid gap-6 md:grid-cols-3">
        {featuredChefs.map((chef) => (
          <ChefCard key={chef.id} chef={chef} />
        ))}
      </div>
    </section>
  );
};

export default FeaturedChefs;
