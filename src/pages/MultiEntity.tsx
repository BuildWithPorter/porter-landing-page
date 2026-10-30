import { MULTI_ENTITY_PAGE } from "../content/topicPages";
import { TopicPageView } from "./TopicPage";

// Reason: the multi-entity campaign host still renders this page at "/".
export function MultiEntityPage() {
  return <TopicPageView page={MULTI_ENTITY_PAGE} />;
}
