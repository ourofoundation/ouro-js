import { Content } from "../../schema/posts";
import { Profile } from "../../schema/users";

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
  if (!json || !json?.content) return { users: [], assets: [] };

  const content = json.content.map(extractContent).flat();
  // TODO: should keep the structure instead of flattening to list of strings
  const users = content
    .filter((item: any) => item.type === "mention")
    .map((item: any) => ({
      user_id: item.attrs.id,
      username: item.attrs.label || item.attrs.username,
    }))
    .reduce((unique: any[], item: any) => {
      if (!unique.some((u) => u.user_id === item.user_id)) {
        unique.push(item);
      }
      return unique;
    }, []) as Partial<Profile>[];

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
    .reduce((unique: any[], item: any) => {
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
