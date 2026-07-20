import { useMemo, useState } from 'react'
import type { Category } from '../types'

interface CategoryColumnProps {
  categories: Category[] | null
  selected: string | null
  onSelect: (categoryId: string) => void
}

export function CategoryColumn({ categories, selected, onSelect }: CategoryColumnProps): JSX.Element {
  const [filter, setFilter] = useState('')

  const filtered = useMemo(() => {
    if (!categories) return null
    const query = filter.trim().toLowerCase()
    if (!query) return categories
    return categories.filter((c) => c.category_name.toLowerCase().includes(query))
  }, [categories, filter])

  return (
    <div className="flex w-60 shrink-0 flex-col border-r border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900/50">
      <div className="p-2">
        <input
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Filter categories…"
          className="w-full rounded-md border border-zinc-300 bg-white px-2.5 py-1.5 text-xs outline-none focus:border-indigo-500 dark:border-zinc-700 dark:bg-zinc-800"
        />
      </div>
      <div className="flex-1 space-y-0.5 overflow-y-auto px-2 pb-2">
        {filtered === null &&
          Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="h-7 animate-pulse rounded-md bg-zinc-200 dark:bg-zinc-800" />
          ))}
        {filtered?.length === 0 && (
          <p className="px-2 py-4 text-center text-xs text-zinc-500">No categories found</p>
        )}
        {filtered?.map((category) => (
          <button
            key={category.category_id}
            onClick={() => onSelect(category.category_id)}
            className={`block w-full truncate rounded-md px-2.5 py-1.5 text-left text-xs font-medium ${
              selected === category.category_id
                ? 'bg-indigo-600 text-white'
                : 'text-zinc-600 hover:bg-zinc-200 dark:text-zinc-300 dark:hover:bg-zinc-800'
            }`}
            title={category.category_name}
          >
            {category.category_name}
          </button>
        ))}
      </div>
    </div>
  )
}
