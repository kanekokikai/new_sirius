import { TableSection } from "../data/featureContent";

export type OrderCreateType = "搬入" | "引取" | "移動";

export type InventoryFilter = {
  kind: string;
  category: string;
  machineNo: string;
  status: string;
};

export type MachineFilter = {
  kindId: string;
  categoryId: string;
  productNo: string;
  purchaseFrom: string;
  purchaseTo: string;
  division: string;
};

export type OrdersFilter = {
  dateFrom: string;
  dateTo: string;

  customerId: string;
  customerName: string;
  siteId: string;
  siteName: string;

  // 旧仕様：受注一覧の「種類（搬入/引取/移動）」をボタンで複数選択
  kinds: OrderCreateType[];

  kindId: string;
  typeId: string;
  machineNo: string;

  arrangement: "all" | "inhouse" | "other";
  arrangementPartnerId: string; // 手配指定=他社のときのみ入力

  transport: "all" | "unconfirmed" | "client" | "inhouse" | "outsourced";
  transportAssigneeCode: string; // 回送指定!=全件のとき入力（自社=社員ID, 外注=取引先ID）
};

export type SitesFilter = {
  periodFrom: string;
  periodTo: string;
  customer: string;
  site: string;
  lastDeliveryFrom: string;
  lastDeliveryTo: string;
  lastOrderFrom: string;
  lastOrderTo: string;
};

const toLower = (value: string) => value.trim().toLowerCase();
const toDigits = (value: string) => value.replace(/\D/g, "");

export const filterInventorySections = (
  sections: TableSection[],
  search: string,
  filter: InventoryFilter
) => {
  const { kind, category, machineNo, status } = filter;
  const hasAnyFilter = [kind, category, machineNo, status].some((v) => v.trim());
  const q = toLower(search);
  const applyLegacy = !!q && !hasAnyFilter;

  return sections.map((section) => ({
    ...section,
    rows: section.rows.filter((row) => {
      const matchesKind = !kind || String(row[0]).toLowerCase().includes(toLower(kind));
      const matchesCategory = !category || String(row[1]).toLowerCase().includes(toLower(category));
      const matchesMachineNo = !machineNo || String(row[2]).toLowerCase().includes(toLower(machineNo));
      const matchesStatus =
        !status ||
        row.slice(3).some((cell) => String(cell).toLowerCase().includes(toLower(status)));

      if (hasAnyFilter) {
        return matchesKind && matchesCategory && matchesMachineNo && matchesStatus;
      }
      if (applyLegacy) {
        return row.some((cell) => String(cell).toLowerCase().includes(q));
      }
      return true;
    })
  }));
};

export const filterMachineSections = (
  sections: TableSection[],
  search: string,
  filter: MachineFilter
) => {
  const { kindId, categoryId, productNo, purchaseFrom, purchaseTo, division } = filter;
  // NOTE:
  // - purchaseFrom: 画面上は「購入日」(年月日検索) -> row[13]
  // - purchaseTo:   画面上は「売却日」(年月日検索) -> row[18]
  const purchaseDateQuery = purchaseFrom.trim();
  const soldDateQuery = purchaseTo.trim();
  const hasAnyFilter = [kindId, categoryId, productNo, purchaseDateQuery, soldDateQuery, division].some(
    (v) => v.trim()
  );
  const q = toLower(search);
  const applyLegacy = !!q && !hasAnyFilter;

  return sections.map((section) => ({
    ...section,
    rows: section.rows.filter((row) => {
      const matchesKind = !kindId || String(row[0]).toLowerCase().includes(toLower(kindId));
      const matchesCategory = !categoryId || String(row[1]).toLowerCase().includes(toLower(categoryId));
      const matchesProductNo =
        !productNo || String(row[2]).toLowerCase().includes(toLower(productNo));
      const purchaseDateRaw = String(row[13] ?? "");
      const soldDateRaw = String(row[18] ?? "");
      const purchaseDate = purchaseDateRaw.toLowerCase();
      const soldDate = soldDateRaw.toLowerCase();
      const purchaseQ = purchaseDateQuery.toLowerCase();
      const soldQ = soldDateQuery.toLowerCase();
      const purchaseQDigits = toDigits(purchaseQ);
      const soldQDigits = toDigits(soldQ);
      const purchaseDateDigits = toDigits(purchaseDate);
      const soldDateDigits = toDigits(soldDate);

      // 「2024」だけで「2024-xx-xx」や「2024/xx/xx」にマッチさせたいので
      // 文字列includesと「数字だけ」includesの両方で判定する
      const matchesPurchaseDate =
        !purchaseDateQuery ||
        purchaseDate.includes(purchaseQ) ||
        (!!purchaseQDigits && purchaseDateDigits.includes(purchaseQDigits));
      const matchesSoldDate =
        !soldDateQuery ||
        soldDate.includes(soldQ) ||
        (!!soldQDigits && soldDateDigits.includes(soldQDigits));
      const matchesDivision =
        !division || String(row[6]).toLowerCase().includes(toLower(division));

      if (hasAnyFilter) {
        return (
          matchesKind &&
          matchesCategory &&
          matchesProductNo &&
          matchesPurchaseDate &&
          matchesSoldDate &&
          matchesDivision
        );
      }
      if (applyLegacy) {
        return row.some((cell) => String(cell).toLowerCase().includes(q));
      }
      return true;
    })
  }));
};

export const filterOrdersSections = (
  sections: TableSection[],
  search: string,
  filter: OrdersFilter
) => {
  const {
    dateFrom,
    dateTo,
    customerId,
    customerName,
    siteId,
    siteName,
    kinds,
    kindId,
    typeId,
    machineNo,
    arrangement,
    arrangementPartnerId,
    transport,
    transportAssigneeCode
  } = filter;
  const hasAnyFilter = [
    dateFrom,
    dateTo,
    customerId,
    customerName,
    siteId,
    siteName,
    kinds.length ? "kinds" : "",
    kindId,
    typeId,
    machineNo,
    arrangement,
    arrangementPartnerId,
    transport,
    transportAssigneeCode
  ].some((v) => (typeof v === "string" ? v.trim() : !!v));
  const q = toLower(search);
  const applyLegacy = !!q && !hasAnyFilter;

  return sections.map((section) => ({
    ...section,
    rows: section.rows.filter((row) => {
      const orderKind = String(row[1]);
      const orderType = String(row[2]);
      const rowCustomerName = String(row[3]);
      const machine = String(row[4]);
      const siteName = String(row[5]);
      const scheduledDate = String(row[6]);

      const matchesDateFrom = !dateFrom || scheduledDate >= dateFrom;
      const matchesDateTo = !dateTo || scheduledDate <= dateTo;
      const matchesKinds =
        kinds.length === 0 || kinds.some((k) => orderKind.toLowerCase().includes(toLower(k)));
      const matchesKindId = !kindId || orderKind.toLowerCase().includes(toLower(kindId));
      const matchesTypeId = !typeId || orderType.toLowerCase().includes(toLower(typeId));
      const matchesMachineNo = !machineNo || machine.toLowerCase().includes(toLower(machineNo));
      // NOTE: デモデータにはID列が無いので、ID検索は名称列への部分一致として扱う（実データ連携時に置換する）
      const matchesCustomer =
        (!customerId && !customerName) ||
        rowCustomerName.toLowerCase().includes(toLower(customerId || customerName));
      const matchesSite =
        (!siteId && !siteName) ||
        siteName.toLowerCase().includes(toLower(siteId || siteName));

      if (hasAnyFilter) {
        return (
          matchesDateFrom &&
          matchesDateTo &&
          matchesKinds &&
          matchesKindId &&
          matchesTypeId &&
          matchesMachineNo &&
          matchesCustomer &&
          matchesSite
        );
      }
      if (applyLegacy) {
        return row.some((cell) => String(cell).toLowerCase().includes(q));
      }
      return true;
    })
  }));
};

export const filterBySearch = (sections: TableSection[], search: string) => {
  const q = toLower(search);
  if (!q) return sections;

  return sections.map((section) => ({
    ...section,
    rows: section.rows.filter((row) =>
      row.some((cell) => String(cell).toLowerCase().includes(q))
    )
  }));
};

export const filterSiteSections = (
  sections: TableSection[],
  search: string,
  filter: SitesFilter
) => {
  const { periodFrom, periodTo, customer, site, lastDeliveryFrom, lastDeliveryTo, lastOrderFrom, lastOrderTo } =
    filter;
  const q = toLower(search);
  const hasAnyFilter = [
    periodFrom,
    periodTo,
    customer,
    site,
    lastDeliveryFrom,
    lastDeliveryTo,
    lastOrderFrom,
    lastOrderTo
  ].some((v) => v.trim());
  const applyLegacy = !!q && !hasAnyFilter;

  const withinRange = (value: string, from: string, to: string) => {
    if (!value) return false;
    if (from && value < from) return false;
    if (to && value > to) return false;
    return true;
  };

  return sections.map((section) => ({
    ...section,
    rows: section.rows.filter((row) => {
      const siteName = String(row[1]);
      const customerName = String(row[2]);
      const period = String(row[4]);
      const [rangeStartRaw, rangeEndRaw] = period.split("~").map((v) => v?.trim() ?? "");
      const lastDelivery = String(row[5] ?? "");
      const lastOrder = String(row[6] ?? "");

      const matchesCustomer = !customer || customerName.toLowerCase().includes(toLower(customer));
      const matchesSite = !site || siteName.toLowerCase().includes(toLower(site));
      const matchesPeriodFrom = !periodFrom || (!!rangeStartRaw && rangeStartRaw >= periodFrom);
      const matchesPeriodTo = !periodTo || (!!rangeEndRaw && rangeEndRaw <= periodTo);
      const matchesLastDelivery =
        !lastDeliveryFrom && !lastDeliveryTo
          ? true
          : withinRange(lastDelivery, lastDeliveryFrom, lastDeliveryTo);
      const matchesLastOrder =
        !lastOrderFrom && !lastOrderTo ? true : withinRange(lastOrder, lastOrderFrom, lastOrderTo);

      if (hasAnyFilter) {
        return (
          matchesCustomer &&
          matchesSite &&
          matchesPeriodFrom &&
          matchesPeriodTo &&
          matchesLastDelivery &&
          matchesLastOrder
        );
      }
      if (applyLegacy) {
        return row.some((cell) => String(cell).toLowerCase().includes(q));
      }
      return true;
    })
  }));
};

