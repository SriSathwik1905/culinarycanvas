
import { Profile } from "@/types/profile";
import ChefCard from "@/components/chef/ChefCard";

interface ChefGridProps {
  chefs: (Profile & { recipe_count?: number })[];
  title: string;
}

export const ChefGrid = ({ chefs, title }: ChefGridProps) => {
  return (
    <section>
      <h2 className="mb-6 text-2xl font-semibold text-gray-900">{title}</h2>
      {chefs.length === 0 ? (
        <div className="rounded-lg bg-white p-8 text-center shadow-md">
          <h3 className="mb-2 text-xl font-semibold text-gray-900">No chefs found</h3>
          <p className="text-gray-600">Try adjusting your search criteria</p>
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {chefs.map((chef) => (
            <ChefCard key={chef.id} chef={chef} />
          ))}
        </div>
      )}
    </section>
  );
};

export default ChefGrid;
