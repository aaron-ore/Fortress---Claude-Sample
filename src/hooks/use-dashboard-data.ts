import { useState, useEffect, useCallback, useMemo } from "react";
import { DateRange } from "react-day-picker";
import { format, isWithinInterval, startOfDay, endOfDay, isValid, subMonths, subDays, startOfMonth } from "date-fns";
import { useInventory, InventoryItem } from "@/context/InventoryContext";
import { useOrders, OrderItem } from "@/context/OrdersContext";
import { useStockMovement } from "@/context/StockMovementContext";
import { useProfile } from "@/context/ProfileContext";
import { useOnboarding, InventoryFolder } from "@/context/OnboardingContext";
import { parseAndValidateDate } from "@/utils/dateUtils";
import { supabase } from "@/lib/supabaseClient";
import { useVendors } from "@/context/VendorContext";

import { StockMovement } from "@/context/StockMovementContext";

interface DashboardContentData {
  metrics: {
    totalStockValue: number;
    totalUnitsOnHand: number;
    lowStockItemsCount: number;
    outOfStockItemsCount: number;
    ordersDueTodayCount: number;
    incomingShipmentsCount: number;
    recentAdjustmentsCount: number;
    totalIncome: number;
    totalLosses: number;
    fulfillmentPercentage: number;
    pendingPercentage: number;
    inventoryTurnoverRate: string;
    supplierPerformanceScore: "good" | "average" | "bad";
  };
  charts: {
    last3MonthSalesData: any[];
    monthlyOverviewData: any[];
    liveActivityData: any[];
    totalStockValueTrendData: any[];
    salesInventoryTrendData: any[];
    demandForecastData: any[];
    weeklyRevenueData: any[];
    profitabilityMetricsData: any[];
    topStockBulletGraphData: any[];
    locationStockHealthData: any[];
  };
  lists: {
    lowStockItems: InventoryItem[];
    outOfStockItems: InventoryItem[];
    recentSalesOrders: OrderItem[];
    recentPurchaseOrders: OrderItem[];
    openPurchaseOrders: OrderItem[];
    pendingInvoices: OrderItem[];
    recentShipments: OrderItem[];
    topSellingProducts: { name: string; unitsSold: number }[];
    pendingDiscrepanciesCount: number;
    previousPeriodDiscrepanciesCount: number;
    dailyIssuesCount: number;
    previousPeriodIssuesCount: number;
  };
}

interface UseDashboardHookResult {
  data: DashboardContentData | null;
  pdfProps: any;
  isLoading: boolean;
  error: string | null;
  refresh: () => void;
}

export const useDashboardData = (dateRange: DateRange | undefined): UseDashboardHookResult => {
  const { inventoryItems, isLoadingInventory, refreshInventory } = useInventory();
  const { orders, isLoadingOrders, fetchOrders } = useOrders();
  const { stockMovements, isLoadingStockMovements, fetchStockMovements } = useStockMovement();
  const { refreshVendors } = useVendors();
  const { profile, isLoadingProfile, fetchAllProfiles } = useProfile();
  const { inventoryFolders: structuredLocations, fetchInventoryFolders } = useOnboarding();

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const refresh = useCallback(() => {
    setError(null);
    setRefreshTrigger(prev => prev + 1);
    refreshInventory();
    fetchOrders();
    fetchStockMovements();
    refreshVendors(); // Re-enabled
    fetchAllProfiles();
    fetchInventoryFolders();
  }, [refreshInventory, fetchOrders, fetchStockMovements, refreshVendors, fetchAllProfiles, fetchInventoryFolders]);

  const filterDataByDateRange = useCallback((items: any[], dateKey: string) => {
    const filterFrom = (dateRange?.from && isValid(dateRange.from)) ? startOfDay(dateRange.from) : null;
    const filterTo = (dateRange?.to && isValid(dateRange.to)) ? endOfDay(dateRange.to) : ((dateRange?.from && isValid(dateRange.from)) ? endOfDay(dateRange.from) : null);

    if (!filterFrom || !filterTo) return items;

    return items.filter((item: any) => { // Explicitly type item
      const itemDate = parseAndValidateDate(item[dateKey]);
      return itemDate && isValid(itemDate) && isWithinInterval(itemDate, { start: filterFrom, end: filterTo });
    });
  }, [dateRange]);

  const [pendingDiscrepanciesCount, setPendingDiscrepanciesCount] = useState(0);
  const [previousPeriodDiscrepanciesCount, setPreviousPeriodDiscrepanciesCount] = useState(0);
  const [dailyIssuesCount, setDailyIssuesCount] = useState(0);
  const [previousPeriodIssuesCount, setPreviousPeriodIssuesCount] = useState(0);

  const fetchDiscrepancyAndIssueCounts = useCallback(async () => {
    if (!profile?.organizationId) {
      setPendingDiscrepanciesCount(0);
      setPreviousPeriodDiscrepanciesCount(0);
      setDailyIssuesCount(0);
      setPreviousPeriodIssuesCount(0);
      return;
    }

    const today = new Date();
    let currentPeriodStart: Date;
    let currentPeriodEnd: Date;
    let previousPeriodStart: Date;
    let previousPeriodEnd: Date;

    currentPeriodStart = (dateRange?.from && isValid(dateRange.from)) ? startOfDay(dateRange.from) : startOfDay(today);
    currentPeriodEnd = (dateRange?.to && isValid(dateRange.to)) ? endOfDay(dateRange.to) : ((dateRange?.from && isValid(dateRange.from)) ? endOfDay(dateRange.from) : endOfDay(today));

    const durationMs = currentPeriodEnd.getTime() - currentPeriodStart.getTime();
    previousPeriodEnd = subDays(currentPeriodStart, 1);
    previousPeriodStart = new Date(previousPeriodEnd.getTime() - durationMs);

    const fetchCount = async (table: string, activityType: string | null, start: Date, end: Date) => {
      let query = supabase
        .from(table)
        .select('id', { count: 'exact' })
        .eq('organization_id', profile.organizationId)
        .gte('timestamp', start.toISOString())
        .lte('timestamp', end.toISOString());

      if (table === 'discrepancies') {
        query = query.eq('status', 'pending');
      } else if (table === 'activity_logs' && activityType) {
        query = query.eq('activity_type', activityType);
      }

      const { count, error: countError } = await query;

      if (countError) {
        console.error(`Error fetching ${table} count:`, countError);
        // showError(`Failed to load ${table} count.`); // Removed showError to prevent toast spam
        return 0;
      }
      return count || 0;
    };

    const currentDiscrepancyCount = await fetchCount('discrepancies', null, currentPeriodStart, currentPeriodEnd);
    const prevDiscrepancyCount = await fetchCount('discrepancies', null, previousPeriodStart, previousPeriodEnd);
    setPendingDiscrepanciesCount(currentDiscrepancyCount);
    setPreviousPeriodDiscrepanciesCount(prevDiscrepancyCount);

    const currentIssueCount = await fetchCount('activity_logs', 'Issue Reported', currentPeriodStart, currentPeriodEnd);
    const prevIssueCount = await fetchCount('activity_logs', 'Issue Reported', previousPeriodStart, previousPeriodEnd);
    setDailyIssuesCount(currentIssueCount);
    setPreviousPeriodIssuesCount(prevIssueCount);

  }, [profile?.organizationId, dateRange]);

  useEffect(() => {
    if (!isLoadingProfile && profile?.organizationId) {
      fetchDiscrepancyAndIssueCounts();
    }
  }, [isLoadingProfile, profile?.organizationId, dateRange, fetchDiscrepancyAndIssueCounts]);


  const dashboardData = useMemo<DashboardContentData | null>(() => {
    // If any real data is still loading, return null to show loading state
    if (isLoadingInventory || isLoadingOrders || isLoadingStockMovements || isLoadingProfile || !profile?.organizationId) {
      return null;
    }

    const today = new Date();
    const todayString = format(today, "yyyy-MM-dd");

    const filteredInventory = filterDataByDateRange(inventoryItems, 'lastUpdated');
    const filteredOrders = filterDataByDateRange(orders, 'date');
    const filteredStockMovements = filterDataByDateRange(stockMovements, 'timestamp');

    const totalStockValue = filteredInventory.reduce((sum: number, item: InventoryItem) => sum + (item.quantity * item.unitCost), 0);
    const totalUnitsOnHand = filteredInventory.reduce((sum: number, item: InventoryItem) => sum + item.quantity, 0);
    const lowStockItemsCount = filteredInventory.filter((item: InventoryItem) => item.quantity <= item.reorderLevel).length;
    const outOfStockItemsCount = filteredInventory.filter((item: InventoryItem) => item.quantity === 0).length;
    const ordersDueTodayCount = filteredOrders.filter(
      (order: OrderItem) => format(parseAndValidateDate(order.dueDate) || new Date(), "yyyy-MM-dd") === todayString && order.status !== "Shipped" && order.status !== "Packed"
    ).length;
    const incomingShipmentsCount = filteredOrders.filter((order: OrderItem) => order.type === "Purchase" && order.status !== "Shipped").length;
    const recentAdjustmentsCount = filteredStockMovements.filter(
      (movement: StockMovement) => format(parseAndValidateDate(movement.timestamp) || new Date(), "yyyy-MM-dd") === todayString
    ).length;

    const totalSalesRevenue = filteredOrders.filter((order: OrderItem) => order.type === "Sales").reduce((sum: number, order: OrderItem) => sum + order.totalAmount, 0);
    const totalPurchaseCost = filteredOrders.filter((order: OrderItem) => order.type === "Purchase").reduce((sum: number, order: OrderItem) => sum + order.totalAmount, 0);
    const totalIncome = totalSalesRevenue;
    const totalLosses = totalPurchaseCost;

    const totalOrders = filteredOrders.length;
    const fulfilledOrders = filteredOrders.filter(
      (order: OrderItem) => order.status === "Shipped" || order.status === "Packed"
    ).length;
    const fulfillmentPercentage = totalOrders > 0 ? Math.round((fulfilledOrders / totalOrders) * 100) : 0;
    const pendingPercentage = 100 - fulfillmentPercentage;

    const totalInventoryCost = inventoryItems.reduce((sum: number, item: InventoryItem) => sum + (item.quantity * item.unitCost), 0);
    const inventoryTurnoverRate = totalInventoryCost > 0 ? `${(totalSalesRevenue / totalInventoryCost).toFixed(1)}x` : "N/A";

    const supplierPerformanceScore: "good" | "average" | "bad" = "good";

    const last3MonthSalesData = (() => {
      const monthlyData: { [key: string]: { salesRevenue: number; newInventory: number; itemsShipped: number } } = {};
      const effectiveFrom = subMonths(today, 2);
      let currentDate = startOfMonth(effectiveFrom);
      while (currentDate.getTime() <= today.getTime()) {
        const monthKey = format(currentDate, "MMM yyyy");
        monthlyData[monthKey] = { salesRevenue: 0, newInventory: 0, itemsShipped: 0 };
        currentDate = subMonths(currentDate, -1);
      }

      orders.filter((order: OrderItem) => order.type === "Sales").forEach((order: OrderItem) => {
        const orderDate = parseAndValidateDate(order.date);
        if (!orderDate || !isValid(orderDate)) return;
        const monthKey = format(orderDate, "MMM yyyy");
        if (monthlyData[monthKey]) {
          monthlyData[monthKey].salesRevenue += order.totalAmount;
          monthlyData[monthKey].itemsShipped += order.itemCount;
        }
      });

      inventoryItems.forEach((item: InventoryItem) => {
        const itemDate = parseAndValidateDate(item.createdAt); // Accessing createdAt
        if (!itemDate || !isValid(itemDate)) return;
        const monthKey = format(itemDate, "MMM yyyy");
        if (monthlyData[monthKey]) {
          monthlyData[monthKey].newInventory += item.quantity;
        }
      });

      return Object.keys(monthlyData).sort((a: string, b: string) => { // Explicitly type a, b
        const dateA = parseAndValidateDate(a);
        const dateB = parseAndValidateDate(b);
        if (!dateA || !dateB) return 0;
        return dateA.getTime() - dateB.getTime();
      }).map((monthKey: string) => ({ // Explicitly type monthKey
        name: format(parseAndValidateDate(monthKey) || new Date(), "MMM"),
        "Sales Revenue": parseFloat(monthlyData[monthKey].salesRevenue.toFixed(2)),
        "New Inventory Added": parseFloat(monthlyData[monthKey].newInventory.toFixed(0)),
        "Items Shipped": parseFloat(monthlyData[monthKey].itemsShipped.toFixed(0)),
      }));
    })();

    const monthlyOverviewData = (() => {
      const monthlyData: { [key: string]: { salesRevenue: number; inventoryValue: number; purchaseVolume: number } } = {};
      const effectiveFrom = subMonths(today, 11);
      let currentDate = startOfMonth(effectiveFrom);
      while (currentDate.getTime() <= today.getTime()) {
        const monthKey = format(currentDate, "MMM yyyy");
        monthlyData[monthKey] = { salesRevenue: 0, inventoryValue: 0, purchaseVolume: 0 };
        currentDate = subMonths(currentDate, -1);
      }

      orders.forEach((order: OrderItem) => {
        const orderDate = parseAndValidateDate(order.date);
        if (!orderDate || !isValid(orderDate)) return;
        const monthKey = format(orderDate, "MMM yyyy");
        if (monthlyData[monthKey]) {
          if (order.type === "Sales") {
            monthlyData[monthKey].salesRevenue += order.totalAmount;
          } else if (order.type === "Purchase") {
            monthlyData[monthKey].purchaseVolume += order.itemCount;
          }
        }
      });

      const totalCurrentInventoryValue = inventoryItems.reduce((sum: number, item: InventoryItem) => sum + (item.quantity * item.unitCost), 0);
      Object.keys(monthlyData).sort((a: string, b: string) => { // Explicitly type a, b
        const dateA = parseAndValidateDate(a);
        const dateB = parseAndValidateDate(b);
        if (!dateA || !dateB) return 0;
        return dateA.getTime() - dateB.getTime();
      }).forEach((monthKey: string, index: number, array: string[]) => { // Explicitly type monthKey, index, array
        if (monthKey === format(today, "MMM yyyy")) {
          monthlyData[monthKey].inventoryValue = totalCurrentInventoryValue;
        } else {
          const factor = (index + 1) / array.length;
          monthlyData[monthKey].inventoryValue = totalCurrentInventoryValue * (0.8 + 0.4 * factor);
        }
      });

      return Object.keys(monthlyData).sort((a: string, b: string) => { // Explicitly type a, b
        const dateA = parseAndValidateDate(a);
        const dateB = parseAndValidateDate(b);
        if (!dateA || !dateB) return 0;
        return dateA.getTime() - dateB.getTime();
      }).map((monthKey: string) => ({ // Explicitly type monthKey
        name: format(parseAndValidateDate(monthKey) || new Date(), "MMM"),
        "Sales Revenue": parseFloat(monthlyData[monthKey].salesRevenue.toFixed(2)),
        "Inventory Value": parseFloat(monthlyData[monthKey].inventoryValue.toFixed(2)),
        "Purchase Volume": parseFloat(monthlyData[monthKey].purchaseVolume.toFixed(0)),
      }));
    })();

    const liveActivityData = (() => {
      const dailyMetrics: { [key: string]: { salesVolume: number; purchaseVolume: number; adjustments: number } } = {};
      const filterFrom = (dateRange?.from && isValid(dateRange.from)) ? startOfDay(dateRange.from) : subDays(startOfDay(today), 6);
      const filterTo = (dateRange?.to && isValid(dateRange.to)) ? endOfDay(dateRange.to) : ((dateRange?.from && isValid(dateRange.from)) ? endOfDay(dateRange.from) : endOfDay(today));

      let currentDate = new Date(filterFrom);
      while (currentDate.getTime() <= filterTo.getTime()) {
        const dateKey = format(currentDate, "MMM dd");
        dailyMetrics[dateKey] = { salesVolume: 0, purchaseVolume: 0, adjustments: 0 };
        currentDate = subDays(currentDate, -1);
      }

      orders.forEach((order: OrderItem) => {
        const orderDate = parseAndValidateDate(order.date);
        if (!orderDate || !isValid(orderDate)) return;
        const dateKey = format(orderDate, "MMM dd");
        if (dailyMetrics[dateKey] && isWithinInterval(orderDate, { start: filterFrom, end: filterTo })) {
          if (order.type === "Sales") {
            dailyMetrics[dateKey].salesVolume += order.itemCount;
          } else if (order.type === "Purchase") {
            dailyMetrics[dateKey].purchaseVolume += order.itemCount;
          }
        }
      });

      stockMovements.forEach((movement: StockMovement) => { // Explicitly type movement
        const moveDate = parseAndValidateDate(movement.timestamp);
        if (!moveDate || !isValid(moveDate)) return;
        const dateKey = format(moveDate, "MMM dd");
        if (dailyMetrics[dateKey] && isWithinInterval(moveDate, { start: filterFrom, end: filterTo })) {
          dailyMetrics[dateKey].adjustments += movement.amount;
        }
      });

      return Object.keys(dailyMetrics).sort((a: string, b: string) => { // Explicitly type a, b
        const dateA = parseAndValidateDate(a);
        const dateB = parseAndValidateDate(b);
        if (!dateA || !dateB || !isValid(dateA) || !isValid(dateB)) return 0;
        return dateA.getTime() - dateB.getTime();
      }).map((dateKey: string) => { // Explicitly type dateKey
        const totalDailyActivity = dailyMetrics[dateKey].salesVolume + dailyMetrics[dateKey].purchaseVolume + dailyMetrics[dateKey].adjustments;
        return {
          name: dateKey,
          "Total Daily Activity": totalDailyActivity,
        };
      });
    })();

    const totalStockValueTrendData = (() => {
      const dataPoints = [];
      const totalCurrentInventoryValue = inventoryItems.reduce((sum: number, item: InventoryItem) => sum + (item.quantity * item.unitCost), 0);
      for (let i = 0; i < 6; i++) {
        const month = subMonths(today, 5 - i);
        const monthName = format(month, "MMM");
        let simulatedValue;
        if (i === 5) {
          simulatedValue = totalStockValue;
        } else {
          const trendFactor = (i + 1) / 6;
          const baseValue = totalCurrentInventoryValue > 0 ? totalCurrentInventoryValue * (0.7 + (0.3 * trendFactor)) : 0;
          simulatedValue = Math.max(0, baseValue + (Math.random() - 0.5) * (totalCurrentInventoryValue * 0.1));
        }
        dataPoints.push({ name: monthName, value: parseFloat(simulatedValue.toFixed(2)) });
      }
      return dataPoints;
    })();

    const salesInventoryTrendData = (() => {
      const dataPoints = [];
      const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      const currentMonthIndex = new Date().getMonth();

      const totalCurrentInventoryValue = inventoryItems.reduce((sum: number, item: InventoryItem) => sum + (item.quantity * item.unitCost), 0);
      const totalCurrentSalesRevenue = orders.filter((o: OrderItem) => o.type === "Sales").reduce((sum: number, o: OrderItem) => sum + o.totalAmount, 0);

      for (let i = 0; i < 6; i++) {
        const monthIndex = (currentMonthIndex - 5 + i + 12) % 12;
        const monthName = months[monthIndex];

        let simulatedInventoryValue;
        let simulatedSalesRevenue;

        if (i === 5) {
          simulatedInventoryValue = totalCurrentInventoryValue;
          simulatedSalesRevenue = totalCurrentSalesRevenue;
        } else {
          const trendFactor = (i + 1) / 6;
          const baseValue = totalCurrentInventoryValue > 0 ? totalCurrentInventoryValue * (0.7 + (0.3 * trendFactor)) : 0;
          simulatedInventoryValue = Math.max(0, baseValue + (Math.random() - 0.5) * (totalCurrentInventoryValue * 0.1));
          const baseSalesValue = totalCurrentSalesRevenue > 0 ? totalCurrentSalesRevenue * (0.7 + (0.3 * trendFactor)) : 0;
          simulatedSalesRevenue = Math.max(0, baseSalesValue + (Math.random() - 0.5) * (totalCurrentSalesRevenue * 0.1));
        }

        dataPoints.push({
          name: monthName,
          "Sales Revenue": parseFloat(simulatedSalesRevenue.toFixed(2)),
          "Inventory Value": parseFloat(simulatedInventoryValue.toFixed(2)),
        });
      }
      return dataPoints;
    })();

    const demandForecastData = (() => {
      const historicalSales: { [key: string]: number } = {};
      for (let i = 5; i >= 0; i--) {
        const month = subMonths(today, i);
        const monthKey = format(month, "MMM yyyy");
        historicalSales[monthKey] = 0;
      }

      orders.filter((order: OrderItem) => order.type === "Sales").forEach((order: OrderItem) => {
        const orderDate = parseAndValidateDate(order.date);
        if (!orderDate || !isValid(orderDate)) return;
        const monthKey = format(orderDate, "MMM yyyy");
        if (historicalSales.hasOwnProperty(monthKey)) {
          historicalSales[monthKey] += order.totalAmount;
        }
      });

      const chartData = [];
      const historicalKeys = Object.keys(historicalSales).sort((a: string, b: string) => { // Explicitly type a, b
        const dateA = parseAndValidateDate(a);
        const dateB = parseAndValidateDate(b);
        if (!dateA || !dateB) return 0;
        return dateA.getTime() - dateB.getTime();
      });

      historicalKeys.forEach((monthKey: string) => { // Explicitly type monthKey
        chartData.push({
          name: format(parseAndValidateDate(monthKey) || new Date(), "MMM"),
          "Actual Sales": parseFloat(historicalSales[monthKey].toFixed(2)),
          "Projected Demand": null,
        });
      });

      const lastThreeMonthsSales = historicalKeys.slice(-3).map((key: string) => historicalSales[key]); // Explicitly type key
      const averageSales = lastThreeMonthsSales.length > 0
        ? lastThreeMonthsSales.reduce((sum: number, val: number) => sum + val, 0) / lastThreeMonthsSales.length
        : 0;

      for (let i = 1; i <= 3; i++) {
        const futureMonth = subMonths(today, -i);
        const futureMonthName = format(futureMonth, "MMM");
        const projectedValue = averageSales > 0 ? Math.max(0, averageSales * (1 + (Math.random() - 0.5) * 0.1)) : 0;
        chartData.push({
          name: futureMonthName,
          "Actual Sales": null,
          "Projected Demand": parseFloat(projectedValue.toFixed(2)),
        });
      }
      return chartData;
    })();

    const weeklyRevenueData = (() => {
      const weeklyDataPoints = [];
      const thisWeekRevenue: { [key: string]: number } = {};
      const lastWeekRevenue: { [key: string]: number } = {};
      const daysOfWeek = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
      const currentDayIndex = today.getDay();

      orders.filter((order: OrderItem) => order.type === "Sales").forEach((order: OrderItem) => {
        const orderDate = parseAndValidateDate(order.date);
        if (!orderDate || !isValid(orderDate)) return;
        const diffDays = Math.floor((today.getTime() - orderDate.getTime()) / (1000 * 60 * 60 * 24));

        if (diffDays >= 0 && diffDays < 7) {
          const dayName = format(orderDate, "E");
          thisWeekRevenue[dayName] = (thisWeekRevenue[dayName] || 0) + order.totalAmount;
        } else if (diffDays >= 7 && diffDays < 14) {
          const dayName = format(orderDate, "E");
          lastWeekRevenue[dayName] = (lastWeekRevenue[dayName] || 0) + order.totalAmount;
        }
      });

      for (let i = 0; i < 7; i++) {
        const dayIndex = (currentDayIndex + i) % 7;
        const dayName = daysOfWeek[dayIndex];
        const thisWeekVal = thisWeekRevenue[dayName] || 0;
        const lastWeekVal = lastWeekRevenue[dayName] || 0;
        weeklyDataPoints.push({
          name: dayName,
          "This Week": parseFloat(thisWeekVal.toFixed(2)),
          "Last Week": parseFloat(lastWeekVal.toFixed(2)),
        });
      }
      return weeklyDataPoints;
    })();

    const profitabilityMetricsData = (() => {
      let totalSalesRevenueCalc = 0;
      let totalCostOfGoodsSold = 0;

      orders.filter((order: OrderItem) => order.type === "Sales").forEach((order: OrderItem) => {
        totalSalesRevenueCalc += order.totalAmount;
        order.items.forEach((orderItem: any) => { // Explicitly type orderItem
          const inventoryItem = inventoryItems.find((inv: InventoryItem) => inv.id === orderItem.inventoryItemId);
          if (inventoryItem) {
            totalCostOfGoodsSold += orderItem.quantity * inventoryItem.unitCost;
          } else {
            totalCostOfGoodsSold += orderItem.quantity * orderItem.unitPrice * 0.7;
          }
        });
      });

      const grossProfit = totalSalesRevenueCalc - totalCostOfGoodsSold;
      const grossProfitMargin = totalSalesRevenueCalc > 0 ? (grossProfit / totalSalesRevenueCalc) * 100 : 0;
      const simulatedOperatingExpenses = totalSalesRevenueCalc * 0.20;
      const netProfit = grossProfit - simulatedOperatingExpenses;
      const netProfitMargin = totalSalesRevenueCalc > 0 ? (netProfit / totalSalesRevenueCalc) * 100 : 0;
      const simulatedLossesPercentage = totalSalesRevenueCalc > 0 ? (totalSalesRevenueCalc * 0.05 / totalSalesRevenueCalc) * 100 : 0;

      return [
        { name: "Gross Margin", value: parseFloat(grossProfitMargin.toFixed(0)), color: "#00BFD8" },
        { name: "Net Margin", value: parseFloat(netProfitMargin.toFixed(0)), color: "#00C49F" },
        { name: "Simulated Losses", value: parseFloat(simulatedLossesPercentage.toFixed(0)), color: "#0088FE" },
      ];
    })();

    const topStockBulletGraphData = (() => {
      return inventoryItems
        .sort((a: InventoryItem, b: InventoryItem) => b.quantity - a.quantity) // Explicitly type a, b
        .slice(0, 4)
        .map((item: InventoryItem) => ({ // Explicitly type item
          name: item.name,
          quantity: item.quantity,
          reorderLevel: item.reorderLevel,
        }));
    })();

    const locationStockHealthData = (() => {
      const locationMetrics: {
        [key: string]: {
          totalMovements: number;
          currentStock: number;
          netChange: number;
          displayName: string;
        };
      } = {};

      structuredLocations.forEach((loc: InventoryFolder) => { // Explicitly type loc
        locationMetrics[loc.id] = {
          totalMovements: 0,
          currentStock: 0,
          netChange: 0,
          displayName: loc.name,
        };
      });

      stockMovements.forEach((movement: StockMovement) => { // Explicitly type movement
        const item = inventoryItems.find((inv: InventoryItem) => inv.id === movement.itemId); // Explicitly type inv
        if (item) {
          const movementFolderId = item.folderId;
          if (locationMetrics[movementFolderId]) {
            locationMetrics[movementFolderId].totalMovements += movement.amount;
            if (movement.type === "add") {
              locationMetrics[movementFolderId].netChange += movement.amount;
            } else {
              locationMetrics[movementFolderId].netChange -= movement.amount;
            }
          }
        }
      });

      inventoryItems.forEach((item: InventoryItem) => { // Explicitly type item
        if (locationMetrics[item.folderId]) {
          locationMetrics[item.folderId].currentStock += item.quantity;
        }
        if (item.pickingBinFolderId && item.pickingBinFolderId !== item.folderId && locationMetrics[item.pickingBinFolderId]) {
          locationMetrics[item.pickingBinFolderId].currentStock += item.pickingBinQuantity;
        }
      });

      const healthData = Object.entries(locationMetrics).map(([_locationString, metrics]) => {
        const totalActivity = metrics.totalMovements;
        const currentStock = metrics.currentStock;
        const netChange = metrics.netChange;

        const percentage = totalActivity + currentStock > 0
          ? Math.min(100, Math.round((totalActivity / (totalActivity + currentStock)) * 100))
          : 0;

        const isPositive = netChange >= 0 || percentage > 50;

        return {
          label: metrics.displayName,
          percentage,
          isPositive,
          movementScore: totalActivity,
        };
      });

      return healthData.sort((a: any, b: any) => b.movementScore - a.movementScore).slice(0, 4); // Explicitly type a, b
    })();


    const lowStockItems = filteredInventory.filter((item: InventoryItem) => item.quantity > 0 && item.quantity <= item.reorderLevel);
    const outOfStockItems = filteredInventory.filter((item: InventoryItem) => item.quantity === 0);

    const recentSalesOrders = filteredOrders
      .filter((order: OrderItem) => order.type === "Sales")
      .sort((a: OrderItem, b: OrderItem) => { // Explicitly type a, b
        const dateA = parseAndValidateDate(a.date);
        const dateB = parseAndValidateDate(b.date);
        if (!dateA || !dateB || !isValid(dateA) || !isValid(dateB)) return 0;
        return dateB.getTime() - dateA.getTime();
      })
      .slice(0, 5);

    const recentPurchaseOrders = filteredOrders
      .filter((order: OrderItem) => order.type === "Purchase")
      .sort((a: OrderItem, b: OrderItem) => { // Explicitly type a, b
        const dateA = parseAndValidateDate(a.date);
        const dateB = parseAndValidateDate(b.date);
        if (!dateA || !dateB || !isValid(dateA) || !isValid(dateB)) return 0;
        return dateB.getTime() - dateB.getTime();
      })
      .slice(0, 5);

    const openPurchaseOrders = orders
      .filter((order: OrderItem) => order.type === "Purchase" && order.status !== "Shipped" && order.status !== "Archived")
      .sort((a: OrderItem, b: OrderItem) => { // Explicitly type a, b
        const dateA = parseAndValidateDate(a.dueDate);
        const dateB = parseAndValidateDate(b.dueDate);
        if (!dateA || !dateB) return 0;
        return dateA.getTime() - dateB.getTime();
      })
      .slice(0, 5);

    const pendingInvoices = orders
      .filter((order: OrderItem) => { // Explicitly type order
        const orderDueDate = parseAndValidateDate(order.dueDate);
        const thirtyDaysAgo = subDays(new Date(), 30);
        return (
          order.type === "Sales" &&
          order.status !== "Shipped" &&
          order.status !== "Archived" &&
          order.status !== "Packed" &&
          orderDueDate && isValid(orderDueDate) && isWithinInterval(orderDueDate, { start: new Date(0), end: thirtyDaysAgo })
        );
      })
      .sort((a: OrderItem, b: OrderItem) => { // Explicitly type a, b
        const dateA = parseAndValidateDate(a.dueDate);
        const dateB = parseAndValidateDate(b.dueDate);
        if (!dateA || !dateB) return 0;
        return dateA.getTime() - dateB.getTime();
      })
      .slice(0, 5);

    const recentShipments = orders
      .filter((order: OrderItem) => order.type === "Sales" && order.status === "Shipped")
      .sort((a: OrderItem, b: OrderItem) => { // Explicitly type a, b
        const dateA = parseAndValidateDate(a.date);
        const dateB = parseAndValidateDate(b.date);
        if (!dateA || !dateB) return 0;
        return dateB.getTime() - dateA.getTime();
      })
      .slice(0, 5);

    const topSellingProducts = inventoryItems
      .map((item: InventoryItem) => ({ // Explicitly type item
        name: item.name,
        unitsSold: item.quantity > 0 ? Math.floor(item.quantity * (0.1 + Math.random() * 0.4)) + 1 : 0,
      }))
      .filter((product: { name: string; unitsSold: number }) => product.unitsSold > 0) // Explicitly type product
      .sort((a: { name: string; unitsSold: number }, b: { name: string; unitsSold: number }) => b.unitsSold - a.unitsSold) // Explicitly type a, b
      .slice(0, 5);

    return {
      metrics: {
        totalStockValue,
        totalUnitsOnHand,
        lowStockItemsCount,
        outOfStockItemsCount,
        ordersDueTodayCount,
        incomingShipmentsCount,
        recentAdjustmentsCount,
        totalIncome,
        totalLosses,
        fulfillmentPercentage,
        pendingPercentage,
        inventoryTurnoverRate,
        supplierPerformanceScore,
      },
      charts: {
        last3MonthSalesData,
        monthlyOverviewData,
        liveActivityData,
        totalStockValueTrendData,
        salesInventoryTrendData,
        demandForecastData,
        weeklyRevenueData,
        profitabilityMetricsData,
        topStockBulletGraphData,
        locationStockHealthData,
      },
      lists: {
        lowStockItems,
        outOfStockItems,
        recentSalesOrders,
        recentPurchaseOrders,
        openPurchaseOrders,
        pendingInvoices,
        recentShipments,
        topSellingProducts,
        pendingDiscrepanciesCount,
        previousPeriodDiscrepanciesCount,
        dailyIssuesCount,
        previousPeriodIssuesCount,
      },
    };
  }, [
    isLoadingInventory, isLoadingOrders, isLoadingStockMovements, isLoadingProfile,
    inventoryItems, orders, stockMovements, profile, structuredLocations, dateRange,
    pendingDiscrepanciesCount, previousPeriodDiscrepanciesCount, dailyIssuesCount, previousPeriodIssuesCount,
    filterDataByDateRange, refreshTrigger
  ]);

  useEffect(() => {
    if (dashboardData) {
      setIsLoading(false);
    } else if (
      !isLoadingInventory && !isLoadingOrders && !isLoadingStockMovements && !isLoadingProfile
    ) {
      setError("Failed to load dashboard data.");
      setIsLoading(false);
    }
  }, [dashboardData, isLoadingInventory, isLoadingOrders, isLoadingStockMovements, isLoadingProfile]);

  return {
    data: dashboardData,
    pdfProps: null,
    isLoading,
    error,
    refresh,
  };
};