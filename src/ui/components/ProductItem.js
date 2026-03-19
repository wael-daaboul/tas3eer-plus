import { t } from "../../i18n/localization.js";

/**
 * ProductItem Component
 * Renders a single product item in the user's products list.
 * 
 * @param {Object} props - Component properties
 * @param {Object} props.product - The product data object
 * @param {Function} props.onEdit - Callback when edit is clicked
 * @param {Function} props.onDelete - Callback when delete is clicked
 * @param {Function} props.escapeHTML - HTML escaping helper
 */
export function ProductItem(props) {
  const { product, onEdit, onDelete, escapeHTML } = props;
  
  const item = document.createElement("article");
  item.className = "product-item";
  item.dataset.productId = product.id;

  const info = document.createElement("div");
  const recipeCount = product.recipe ? product.recipe.length : 0;
  const variantCount = product.variants ? product.variants.length : 0;
  
  info.innerHTML = `
    <strong>${escapeHTML(product.name)}</strong>
    <div class="meta">
      ${escapeHTML(recipeCount)} ${escapeHTML(t("recipeItemsShort"))} • 
      ${escapeHTML(variantCount)} ${escapeHTML(t("variantsShort"))}
    </div>
  `;

  const actions = document.createElement("div");
  actions.className = "item-actions";

  const edit = document.createElement("button");
  edit.type = "button";
  edit.textContent = t("edit");
  edit.onclick = onEdit;

  const remove = document.createElement("button");
  remove.type = "button";
  remove.className = "remove";
  remove.textContent = t("delete");
  remove.onclick = onDelete;

  actions.append(edit, remove);
  item.append(info, actions);
  
  return item;
}
