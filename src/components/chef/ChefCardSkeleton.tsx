
import { Skeleton } from "@/components/ui/skeleton";

export const ChefCardSkeleton = () => {
  return (
    <div className="flex flex-col rounded-xl bg-white p-6 shadow-md">
      <div className="flex items-center gap-4">
        <Skeleton className="h-16 w-16 rounded-full" />
        <div className="space-y-2">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-4 w-24" />
        </div>
      </div>
      <Skeleton className="mt-4 h-12 w-full" />
      <div className="mt-3 flex gap-1">
        <Skeleton className="h-6 w-16" />
        <Skeleton className="h-6 w-16" />
      </div>
    </div>
  );
};

export default ChefCardSkeleton;
