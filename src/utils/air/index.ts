import { Content } from "@/schema/posts";

interface InlineAssetAttrs {
  id: string;
  assetType: string;
  viewMode: string;
  filters?: any;
  partial?: boolean;
}

const extractContent = (item: any): any => {
  if (Array.isArray(item)) return item.map(extractContent);
  if (item?.content) {
    if (Array.isArray(item.content))
      return item.content.map(extractContent).flat();
    else return extractContent(item.content);
  } else return item; // leaf
};

function getReferencesInContent(json: Content["json"]) {
  if (!json) return { users: [], assets: [] };

  const content = json.content.map(extractContent).flat();
  const users = content
    .filter((item: any) => item.type === "mention")
    .map((item: any) => ({
      user_id: item.attrs.id,
      username: item.attrs.label,
    }))
    .reduce((unique: any[], item) => {
      if (!unique.some((u) => u === item.user_id)) {
        unique.push(item.user_id);
      }
      return unique;
    }, []) as string[];

  const assets = content
    // Filter out assets that still have partial data, must have id
    .filter(
      (item: any) =>
        item.type === "assetComponent" && item.attrs?.id && !item.attrs?.partial
    )
    .map(({ attrs }: { attrs: InlineAssetAttrs }) => ({
      id: attrs.id,
      assetType: attrs.assetType,
    }))
    .reduce((unique: any[], item) => {
      if (!unique.some((u) => u.id === item.id)) {
        unique.push(item);
      }
      return unique;
    }, []) as InlineAssetAttrs[];

  return {
    users,
    assets,
  };
}

export { getReferencesInContent };
