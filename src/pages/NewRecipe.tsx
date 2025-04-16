import { RecipeForm } from "@/components/RecipeForm";

const NewRecipe = () => {
  return (
    <div className="min-h-screen bg-cream p-4">
      <div className="mx-auto mt-20 max-w-2xl">
        <div className="rounded-2xl bg-white p-8 shadow-[8px_8px_16px_#d4d1cd,-8px_-8px_16px_#ffffff]">
          <h1 className="mb-8 text-3xl font-bold text-gray-900">Create New Recipe</h1>
          <RecipeForm />
        </div>
      </div>
    </div>
  );
};

export default NewRecipe;
