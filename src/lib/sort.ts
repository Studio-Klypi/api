export function compileSort(sort: string) {
  sort = sort.trim();

  if (!sort.length) return [];

  const items = sort?.split(',') ?? [];
  return items.reduce<Record<string, string>[]>((acc, item) => {
    const sortOrder = item.startsWith('-') ? 'desc' : 'asc';
    acc = [...acc, { [item.replace('-', '')]: sortOrder }];
    return acc;
  }, []);
}
