"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Plus, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import NewBrandModal from "@/components/brands/NewBrandModal";
import type { Brand } from "@/types";

export default function BrandsPage() {
  const router = useRouter();
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [userRole, setUserRole] = useState("");

  async function fetchBrands() {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const [{ data: brandsData }, { data: profile }] = await Promise.all([
      supabase.from("brands").select("*").order("name"),
      supabase.from("users").select("role").eq("id", user.id).single(),
    ]);

    if (brandsData) setBrands(brandsData as Brand[]);
    if (profile) setUserRole(profile.role);
    setLoading(false);
  }

  useEffect(() => { fetchBrands(); }, []);

  const canCreate = ["super_admin", "admin"].includes(userRole);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">All Brands</h2>
        {canCreate && (
          <Button onClick={() => setModalOpen(true)} size="sm" className="bg-brand hover:bg-brand/90 text-white gap-1.5">
            <Plus size={16} /> New Brand
          </Button>
        )}
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => <div key={i} className="bg-card border border-border rounded-xl p-5 h-36 animate-pulse" />)}
        </div>
      ) : brands.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-2">
          <Building2 size={40} className="opacity-30" />
          <p className="text-sm">No brands yet.</p>
          {canCreate && (
            <Button size="sm" variant="outline" onClick={() => setModalOpen(true)}>Create your first brand</Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {brands.map(brand => (
            <a
              key={brand.id}
              href={`/brands/${brand.id}`}
              className="bg-card border border-border rounded-xl overflow-hidden hover:border-brand/40 transition-colors block group"
            >
              {brand.avatar_url ? (
                <div className="h-28 overflow-hidden">
                  <img
                    src={brand.avatar_url}
                    alt={brand.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                </div>
              ) : (
                <div className="h-28 bg-brand/10 flex items-center justify-center">
                  <Building2 size={32} className="text-brand/40" />
                </div>
              )}

              <div className="p-4 space-y-1">
                <p className="font-semibold text-sm leading-tight">{brand.name}</p>
                {brand.description && (
                  <p className="text-xs text-muted-foreground line-clamp-2">{brand.description}</p>
                )}
              </div>
            </a>
          ))}
        </div>
      )}

      <NewBrandModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onCreated={() => { setModalOpen(false); fetchBrands(); router.refresh(); }}
      />
    </div>
  );
}
