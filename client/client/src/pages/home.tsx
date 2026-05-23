import { useState } from "react";
import {
  useGetRobloxUser,
  useGetGamepasses,
  getGetRobloxUserQueryKey,
  getGetGamepassesQueryKey,
} from "@/lib/api";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Search,
  Loader2,
  AlertCircle,
  ShoppingCart,
  ExternalLink,
  ArrowDownAz,
  RefreshCw,
} from "lucide-react";

export default function Home() {
  const [searchInput, setSearchInput] = useState("");
  const [submittedUsername, setSubmittedUsername] = useState("");

  const {
    data: user,
    isLoading: isLoadingUser,
    isError: isUserError,
  } = useGetRobloxUser(submittedUsername, {
    query: {
      enabled: !!submittedUsername,
      queryKey: getGetRobloxUserQueryKey(submittedUsername),
      retry: false,
    },
  });

  const {
    data: gamepassList,
    isLoading: isLoadingGamepasses,
    isError: isGamepassesError,
    refetch: refetchGamepasses,
  } = useGetGamepasses(user?.id ?? 0, {
    query: {
      enabled: !!user?.id,
      queryKey: getGetGamepassesQueryKey(user?.id ?? 0),
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchInput.trim()) {
      setSubmittedUsername(searchInput.trim());
    }
  };

  return (
    <div className="min-h-[100dvh] w-full flex flex-col items-center bg-background p-6">
      {/* Header */}
      <div className="w-full max-w-4xl flex flex-col items-center mt-12 mb-8 space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center border border-primary/50 robux-glow">
            <ShoppingCart className="w-6 h-6 text-primary" />
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight text-white uppercase drop-shadow-md">
            Donation Hub
          </h1>
        </div>

        <p className="text-muted-foreground text-center max-w-lg">
          Search for a Roblox username to view and donate to their active
          gamepasses directly on the official store.
        </p>

        <form
          onSubmit={handleSubmit}
          className="w-full max-w-lg relative group"
        >
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
          </div>
          <Input
            type="text"
            className="pl-12 pr-24 py-6 w-full bg-card border-card-border text-lg shadow-sm focus-visible:ring-primary focus-visible:border-primary transition-all rounded-xl"
            placeholder="Enter Roblox username..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            data-testid="input-username-search"
          />
          <div className="absolute inset-y-0 right-2 flex items-center">
            <Button
              type="submit"
              className="font-bold rounded-lg px-6"
              disabled={isLoadingUser || !searchInput.trim()}
              data-testid="button-search"
            >
              {isLoadingUser ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                "SEARCH"
              )}
            </Button>
          </div>
        </form>
      </div>

      {/* Content */}
      <div className="w-full max-w-6xl flex flex-col items-center gap-8 pb-20">
        {/* Loading user */}
        {isLoadingUser && (
          <div className="flex flex-col items-center justify-center p-12 gap-4 animate-in fade-in zoom-in duration-300">
            <Loader2 className="h-10 w-10 text-primary animate-spin" />
            <p className="text-primary font-medium tracking-widest uppercase text-sm">
              Locating Player...
            </p>
          </div>
        )}

        {/* User not found */}
        {isUserError && submittedUsername && !isLoadingUser && (
          <Card className="w-full max-w-lg border-destructive/50 bg-destructive/10">
            <CardContent className="flex flex-col items-center justify-center p-8 text-center gap-4">
              <div className="w-16 h-16 rounded-full bg-destructive/20 flex items-center justify-center">
                <AlertCircle className="h-8 w-8 text-destructive" />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-bold text-white">
                  Player Not Found
                </h3>
                <p className="text-muted-foreground">
                  Could not find a user with the username &ldquo;
                  {submittedUsername}&rdquo;.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Profile + gamepasses */}
        {user && (
          <div className="w-full animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-10">
            {/* Creator profile */}
            <Card className="w-full max-w-3xl mx-auto border-card-border bg-card/80 backdrop-blur-sm overflow-hidden robux-glow">
              <div className="h-24 w-full bg-gradient-to-r from-primary/20 to-transparent" />
              <CardContent className="px-8 pb-8 pt-0 -mt-12 relative z-10 flex flex-col sm:flex-row items-center sm:items-end gap-6 text-center sm:text-left">
                <div className="rounded-full p-1 bg-background">
                  <Avatar className="w-28 h-28 border-4 border-card bg-muted">
                    <AvatarImage
                      src={user.avatarUrl ?? undefined}
                      alt={user.displayName}
                      className="object-cover"
                    />
                    <AvatarFallback className="text-3xl font-bold bg-secondary text-primary">
                      {user.displayName.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                </div>
                <div className="flex-1 space-y-1 pb-2">
                  <h2
                    className="text-3xl font-extrabold text-white truncate"
                    data-testid="text-display-name"
                  >
                    {user.displayName}
                  </h2>
                  <p
                    className="text-primary font-medium tracking-wide"
                    data-testid="text-username"
                  >
                    @{user.name}
                  </p>
                </div>
              </CardContent>
              {user.description && (
                <CardFooter className="px-8 pb-8 pt-0">
                  <p className="text-muted-foreground text-sm leading-relaxed max-w-2xl bg-secondary/30 p-4 rounded-lg border border-secondary/50">
                    {user.description}
                  </p>
                </CardFooter>
              )}
            </Card>

            {/* Gamepasses */}
            <div className="w-full space-y-6">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-border pb-4">
                <div className="flex items-center gap-3">
                  <h3 className="text-2xl font-bold text-white">
                    Available Gamepasses
                  </h3>
                  {gamepassList?.cached && (
                    <Badge
                      variant="outline"
                      className="bg-primary/10 text-primary border-primary/20 text-xs px-2 py-0.5"
                    >
                      Cached Results
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground bg-secondary/50 px-3 py-1.5 rounded-full border border-secondary">
                  <ArrowDownAz className="h-4 w-4" />
                  <span>Sorted by Lowest Price</span>
                </div>
              </div>

              {isLoadingGamepasses ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {[1, 2, 3, 4].map((i) => (
                    <Card
                      key={i}
                      className="animate-pulse bg-card/50 border-card-border overflow-hidden"
                    >
                      <div className="w-full aspect-square bg-secondary/50" />
                      <CardContent className="p-4 space-y-4">
                        <div className="h-4 bg-secondary rounded w-3/4" />
                        <div className="h-8 bg-secondary rounded w-1/3" />
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : isGamepassesError ? (
                <div className="flex flex-col items-center justify-center p-12 text-center bg-card rounded-xl border border-card-border">
                  <AlertCircle className="h-10 w-10 text-muted-foreground mb-4" />
                  <p className="text-lg font-medium text-white mb-2">
                    Failed to load gamepasses
                  </p>
                  <Button
                    variant="outline"
                    onClick={() => refetchGamepasses()}
                    className="mt-4"
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Try Again
                  </Button>
                </div>
              ) : gamepassList?.gamepasses.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-16 text-center bg-card rounded-xl border border-card-border">
                  <div className="w-20 h-20 rounded-full bg-secondary flex items-center justify-center mb-6">
                    <ShoppingCart className="h-10 w-10 text-muted-foreground" />
                  </div>
                  <h3 className="text-xl font-bold text-white mb-2">
                    No Gamepasses Found
                  </h3>
                  <p className="text-muted-foreground max-w-md">
                    This user doesn&apos;t have any public gamepasses on sale
                    right now.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {gamepassList?.gamepasses.map((pass) => (
                    <Card
                      key={pass.id}
                      className="group bg-card border-card-border overflow-hidden flex flex-col transition-all duration-300 robux-glow hover:-translate-y-1"
                      data-testid={`card-gamepass-${pass.id}`}
                    >
                      <div className="w-full aspect-square bg-secondary relative overflow-hidden flex items-center justify-center p-4">
                        {pass.iconUrl ? (
                          <img
                            src={pass.iconUrl}
                            alt={pass.name}
                            className="w-full h-full object-contain rounded-lg drop-shadow-xl group-hover:scale-105 transition-transform duration-500"
                            loading="lazy"
                          />
                        ) : (
                          <ShoppingCart className="h-20 w-20 text-muted-foreground/30" />
                        )}
                        <div className="absolute top-3 right-3 bg-black/80 backdrop-blur-md px-3 py-1.5 rounded-full border border-primary/30 flex items-center gap-1.5 shadow-xl">
                          <span className="text-primary font-black text-sm">
                            R$
                          </span>
                          <span className="text-white font-bold tracking-tight">
                            {pass.price.toLocaleString()}
                          </span>
                        </div>
                      </div>

                      <CardContent className="p-5 flex-1 flex flex-col">
                        <h4 className="font-bold text-lg text-white line-clamp-2 leading-tight mb-1 group-hover:text-primary transition-colors">
                          {pass.name}
                        </h4>
                        {pass.gameName && (
                          <p className="text-xs text-muted-foreground line-clamp-1 mt-auto pt-2 flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-primary/50" />
                            {pass.gameName}
                          </p>
                        )}
                      </CardContent>

                      <div className="p-4 pt-0 mt-auto">
                        <Button
                          className="w-full font-bold group/btn"
                          onClick={() =>
                            window.open(
                              `https://www.roblox.com/game-pass/${pass.id}/redirect`,
                              "_blank"
                            )
                          }
                          data-testid={`button-donate-${pass.id}`}
                        >
                          <span>Donate</span>
                          <ExternalLink className="h-4 w-4 ml-2 opacity-70 group-hover/btn:translate-x-1 group-hover/btn:-translate-y-1 transition-transform" />
                        </Button>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
