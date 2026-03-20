// src/screens/AdminDashboardScreen.web.tsx
import { Ionicons } from "@expo/vector-icons";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import ScreenContainer from "../components/ScreenContainer";
import { useAuth } from "../context/AuthContext";
import { getApiBaseUrlSync } from "../utils/apiBase";
import {
  formatMetricValue,
  formatShortTime,
  formatZarCurrency,
  generateDeterministicTrend,
} from "./adminDashboard/metricsUtils";
// === ADVANCED CHART COMPONENTS ===
const AnimatedBarChart = ({
  data,
  labels,
  color = "#6366f1",
  height = 200,
  title = "",
  showValues = true,
  animated = true,
}) => {
  const animations = useRef(data.map(() => new Animated.Value(0))).current;

  useEffect(() => {
    if (animated && data.length > 0) {
      Animated.stagger(
        100,
        animations.map((anim) =>
          Animated.timing(anim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
        ),
      ).start();
    }
  }, [data]);

  const maxValue = Math.max(...data.filter((val) => !isNaN(val)), 1);

  return (
    <View style={[styles.barChartContainer, { height }]}>
      {title ? <Text style={styles.chartTitle}>{title}</Text> : null}
      <View style={styles.chartBars}>
        {data.map((value, index) => {
          const barHeight = animations[index].interpolate({
            inputRange: [0, 1],
            outputRange: ["0%", `${(Math.max(0, value) / maxValue) * 90}%`],
          });

          return (
            <View key={index} style={styles.barContainer}>
              <View style={styles.barWrapper}>
                <Animated.View
                  style={[
                    styles.bar,
                    {
                      height: barHeight,
                      backgroundColor: color,
                      transform: [
                        {
                          scaleY: animations[index].interpolate({
                            inputRange: [0, 1],
                            outputRange: [0, 1],
                          }),
                        },
                      ],
                    },
                  ]}
                />
                {showValues && (
                  <Text style={styles.barValueText}>
                    {typeof value === "number"
                      ? formatMetricValue(value, "number")
                      : "0"}
                  </Text>
                )}
              </View>
              <Text style={styles.barLabel}>
                {labels[index] || `Item ${index + 1}`}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
};

// Web dashboard gauge uses SVG for lightweight rendering.
// Keep this screen web-only unless replaced with react-native-svg.
const RealTimeSparkline = ({
  data,
  color = "#8b5cf6",
  height = 40,
  width = 100,
}) => {
  const validData = (Array.isArray(data) ? data : []).filter(
    (val) => typeof val === "number" && !isNaN(val),
  );
  if (validData.length === 0) return null;

  const maxValue = Math.max(...validData, 1);
  const barCount = Math.min(validData.length, 24);
  const sliced = validData.slice(-barCount);
  const gap = 2;
  const barWidth = Math.max(
    2,
    Math.floor((width - gap * (barCount - 1)) / barCount),
  );

  return (
    <View
      style={{ width, height, flexDirection: "row", alignItems: "flex-end" }}
    >
      {sliced.map((v, i) => {
        const h = Math.max(2, Math.round((v / maxValue) * height));
        return (
          <View
            key={i}
            style={{
              width: barWidth,
              height: h,
              marginRight: i === sliced.length - 1 ? 0 : gap,
              backgroundColor: color,
              opacity: 0.9,
              borderRadius: 2,
            }}
          />
        );
      })}
    </View>
  );
};

const TimePeriodProjection = ({ period, data, onSelect }) => {
  const projections = {
    "1h": { label: "Next Hour", multiplier: 1.15, color: "#10b981" },
    "3h": { label: "3 Hours", multiplier: 1.35, color: "#f59e0b" },
    "6h": { label: "6 Hours", multiplier: 1.6, color: "#8b5cf6" },
    "24h": { label: "Today", multiplier: 2.2, color: "#6366f1" },
    "7d": { label: "This Week", multiplier: 5.8, color: "#ec4899" },
  };

  const projection = projections[period];
  const toNumber = (value) => {
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric : 0;
  };

  const currentRevenue = toNumber(data?.currentRevenue);
  const projectedGrowth = toNumber(data?.projectedGrowth);
  const projectedValue = toNumber(data?.projectedRevenue)
    ? Math.round(toNumber(data?.projectedRevenue))
    : currentRevenue
      ? Math.round(currentRevenue * projection.multiplier)
      : 0;
  const growthLabel = projectedGrowth
    ? Math.round(projectedGrowth)
    : Math.round((projection.multiplier - 1) * 100);

  return (
    <TouchableOpacity
      style={styles.projectionCard}
      onPress={() => onSelect(period)}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={`Open ${projection.label} projection`}
    >
      <View style={styles.projectionContent}>
        <View style={styles.projectionHeader}>
          <View
            style={[
              styles.projectionBadge,
              { backgroundColor: projection.color + "20" },
            ]}
          >
            <Ionicons name="trending-up" size={14} color={projection.color} />
          </View>
          <Text style={styles.projectionLabel}>{projection.label}</Text>
        </View>

        <Text style={styles.projectionValue}>
          {formatZarCurrency(projectedValue)}
        </Text>
        <Text style={styles.projectionMetricLabel}>
          Projected Gross Revenue
        </Text>

        <View style={styles.projectionMeta}>
          <View style={styles.projectionChange}>
            <Ionicons name="arrow-up" size={10} color={projection.color} />
            <Text
              style={[styles.projectionChangeText, { color: projection.color }]}
            >
              +{growthLabel}%
            </Text>
          </View>
          <Text style={styles.projectionTime}>Projection</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const InteractiveMetricCard = ({
  icon,
  label,
  value,
  change,
  color,
  onClick,
  isLoading = false,
  trendData = [],
  subtitle = "",
  isSelected = false,
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.98,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
    }).start();
  };

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <TouchableOpacity
        style={[
          styles.interactiveMetricCard,
          isHovered && styles.interactiveMetricCardHover,
          isSelected && { borderColor: color, borderWidth: 2, backgroundColor: `${color}12` },
        ]}
        onPress={onClick}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        onMouseEnter={() => Platform.OS === "web" && setIsHovered(true)}
        onMouseLeave={() => Platform.OS === "web" && setIsHovered(false)}
        activeOpacity={0.8}
        accessibilityRole="button"
        accessibilityLabel={`${label} metric details`}
      >
        <View style={styles.metricHeader}>
          <View
            style={[
              styles.metricIconContainer,
              { backgroundColor: color + "15" },
            ]}
          >
            <Ionicons name={icon} size={20} color={color} />
          </View>

          <View style={styles.metricChangeIndicator}>
            <Ionicons
              name={change >= 0 ? "trending-up" : "trending-down"}
              size={12}
              color={change >= 0 ? "#10b981" : "#ef4444"}
            />
            <Text
              style={[
                styles.metricChangeText,
                { color: change >= 0 ? "#10b981" : "#ef4444" },
              ]}
            >
              {Math.abs(change).toFixed(1)}%
            </Text>
          </View>
        </View>

        {isLoading ? (
          <ActivityIndicator
            size="small"
            color={color}
            style={styles.metricLoading}
          />
        ) : (
          <>
            <Text style={[styles.metricValue, { color }]}>{value}</Text>
            <Text style={styles.metricLabel}>{label}</Text>
            {subtitle ? (
              <Text style={styles.metricSubtitle}>{subtitle}</Text>
            ) : null}

            {trendData.length > 0 && (
              <View style={styles.trendContainer}>
                <RealTimeSparkline data={trendData} color={color} />
              </View>
            )}

            {isHovered && (
              <View style={styles.metricHoverOverlay}>
                <Ionicons name="arrow-forward-circle" size={20} color={color} />
              </View>
            )}
          </>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
};

const PerformanceGauge = ({ value, label, color = "#6366f1", size = 80 }) => {
  const circumference = 2 * Math.PI * (size / 2 - 5);
  const progress = Math.min(Math.max(value, 0), 100);
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  return (
    <View style={[styles.gaugeContainer, { width: size, height: size }]}>
      <svg width={size} height={size}>
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={size / 2 - 5}
          fill="none"
          stroke="#e2e8f0"
          strokeWidth="3"
        />
        {/* Progress circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={size / 2 - 5}
          fill="none"
          stroke={color}
          strokeWidth="3"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </svg>
      <View style={styles.gaugeTextContainer}>
        <Text style={styles.gaugeValue}>{progress}%</Text>
        <Text style={styles.gaugeLabel}>{label}</Text>
      </View>
    </View>
  );
};

// === ENTERPRISE MANAGEMENT HUB (Interactive Information Architecture) ===
// A modern, expandable module system for event managers. Each module contains
// grouped actions (subcategories) and can route deeper into nested areas.
const ManagementHubCard = ({
  item,
  expanded,
  onToggle,
  onNavigate,
  shellStyle,
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const heightAnim = useRef(new Animated.Value(expanded ? 1 : 0)).current;
  const rotateAnim = useRef(new Animated.Value(expanded ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(heightAnim, {
      toValue: expanded ? 1 : 0,
      duration: 220,
      useNativeDriver: false,
    }).start();
    Animated.timing(rotateAnim, {
      toValue: expanded ? 1 : 0,
      duration: 220,
      useNativeDriver: true,
    }).start();
  }, [expanded]);

  const estimatedExpandedHeight = Math.max(
    260,
    28 +
      item.groups.reduce((total, group) => {
        const actionCount = Array.isArray(group.actions) ? group.actions.length : 0;
        return total + 28 + actionCount * 74 + Math.max(0, actionCount - 1) * 10 + 14;
      }, 0),
  );

  const bodyHeight = heightAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, estimatedExpandedHeight],
  });

  const chevronRotate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "180deg"],
  });

  return (
    <View style={[styles.mhCardShell, shellStyle]}>
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={onToggle}
        onMouseEnter={() => Platform.OS === "web" && setIsHovered(true)}
        onMouseLeave={() => Platform.OS === "web" && setIsHovered(false)}
        style={[styles.mhCardHeader, isHovered && styles.mhCardHeaderHover]}
        accessibilityRole="button"
        accessibilityLabel={`${item.title} module`}
      >
        <View
          style={[styles.mhIconWrap, { backgroundColor: item.tint + "14" }]}
        >
          <Ionicons name={item.icon} size={18} color={item.tint} />
        </View>
        <View style={styles.mhHeaderText}>
          <Text style={styles.mhTitle}>{item.title}</Text>
          <Text style={styles.mhSubtitle}>{item.subtitle}</Text>
        </View>
        <View style={styles.mhHeaderRight}>
          {!!item.pill && (
            <View
              style={[styles.mhPill, { backgroundColor: item.tint + "12" }]}
            >
              <Text style={[styles.mhPillText, { color: item.tint }]}>
                {item.pill}
              </Text>
            </View>
          )}
          <Animated.View style={{ transform: [{ rotate: chevronRotate }] }}>
            <Ionicons name="chevron-down" size={18} color="#64748b" />
          </Animated.View>
        </View>
      </TouchableOpacity>

      <Animated.View style={[styles.mhCardBody, { height: bodyHeight }]}>
        <View style={styles.mhBodyInner}>
          {item.groups.map((group, gi) => (
            <View key={`${item.id}-g-${gi}`} style={styles.mhGroup}>
              <Text style={styles.mhGroupTitle}>{group.title}</Text>
              <View style={styles.mhActionsGrid}>
                {group.actions.map((action) => (
                  <TouchableOpacity
                    key={`${item.id}-${group.title}-${action.key}`}
                    style={styles.mhAction}
                    activeOpacity={0.88}
                    onPress={() => onNavigate({ ...action, moduleId: item.id })}
                    accessibilityRole="button"
                    accessibilityLabel={`${group.title}: ${action.label}`}
                  >
                    <View
                      style={[
                        styles.mhActionIcon,
                        { backgroundColor: item.tint + "12" },
                      ]}
                    >
                      <Ionicons
                        name={action.icon}
                        size={14}
                        color={item.tint}
                      />
                    </View>
                    <View style={styles.mhActionText}>
                      <Text style={styles.mhActionTitle}>{action.label}</Text>
                      <Text style={styles.mhActionSub} numberOfLines={1}>
                        {action.description}
                      </Text>
                    </View>
                    <Ionicons
                      name="chevron-forward"
                      size={16}
                      color="#94a3b8"
                    />
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          ))}
        </View>
      </Animated.View>
    </View>
  );
};

const REGISTERED_ADMIN_DASHBOARD_ROUTES = new Set([
  "ManagerDashboard",
  "Events",
  "Planner",
  "Profile",
  "CreateEvent",
  "Scanner",
  "HelpCenter",
  "SupportChat",
  "SupportScanner",
  "BrowseEvents",
]);

const HUB_ACTION_ROUTE_OVERRIDES = {
  "events:list": "Events",
  "events:create": "CreateEvent",
  "sales:analytics": "ManagerDashboard",
  "att:scanner": "Scanner",
  "att:manual": "Scanner",
  "support:resend": "SupportChat",
  "support:issues": "SupportChat",
  "support:helpcenter": "HelpCenter",
  "settings:profile": "Profile",
};

const HUB_ROUTE_ALIASES = {
  EventPlanner: "Planner",
  QRScanner: "Scanner",
  OrganizerProfile: "Profile",
  HelpCenter: "HelpCenter",
  ResendTickets: "SupportChat",
  IssueTriage: "SupportChat",
};

const HUB_MODULE_FALLBACK_ROUTES = {
  events: "Planner",
  tickets: "Planner",
  sales: "Events",
  attendees: "Scanner",
  finance: "Planner",
  team: "Planner",
  comm: "Planner",
  support: "SupportChat",
  settings: "Profile",
};

const AdminDashboardScreen = ({ navigation }) => {
  const { getAuthHeader, user, token, apiBaseUrl } = useAuth();
  const { width: viewportWidth } = useWindowDimensions();
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState("24h");
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [dataVersion, setDataVersion] = useState(0);
  const [wsConnected, setWsConnected] = useState(false);
  const [wsError, setWsError] = useState("");
  const wsRef = useRef<WebSocket | null>(null);
  const pulseLoopRef = useRef<Animated.CompositeAnimation | null>(null);
  const isMountedRef = useRef(true);
  const [opsMetrics, setOpsMetrics] = useState({
    totalEvents: 0,
    pendingEvents: 0,
    archivedEvents: 0,
    utilizationRate: 0,
    topCategories: [],
  });

  // Management hub (interactive modules + deep subcategories)
  const [hubQuery, setHubQuery] = useState("");
  // Initialize state to null, so no modules are expanded by default.
  // If you prefer one to be open initially, you can set it to 'events' or another ID.
  const [expandedModuleId, setExpandedModuleId] = useState(null); // Changed from 'events' to null
  const isHubWide = viewportWidth >= 980;

  // Function to handle toggling of management hub modules
  const handleModuleToggle = (moduleId) => {
    setExpandedModuleId((prevExpandedId) => {
      // If the clicked module is already expanded, collapse it (set to null)
      // Otherwise, expand the new module
      return prevExpandedId === moduleId ? null : moduleId;
    });
  };

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const kpiCarouselRef = useRef(null);
  const [kpiCarouselWidth, setKpiCarouselWidth] = useState(0);
  const [kpiCarouselIndex, setKpiCarouselIndex] = useState(0);
  const kpiUserInteractingRef = useRef(false);
  const [isKpiCarouselHovered, setIsKpiCarouselHovered] = useState(false);
  const [enterpriseModal, setEnterpriseModal] = useState({
    visible: false,
    title: "",
    subtitle: "",
    tag: "Info",
    sections: [],
  });
  const [activeCardId, setActiveCardId] = useState("");
  const KPI_VISIBLE_CARDS = 4;
  const KPI_CARD_GAP = 10;
  const KPI_AUTOPLAY_MS = 4000;
  const SECONDARY_KPI_COUNT = 6;
  const isCompactViewport = viewportWidth < 900;
  const isMobileViewport = viewportWidth < 760;

  // Real-time metrics state
  const [realTimeMetrics, setRealTimeMetrics] = useState({
    revenue: { current: 0, change: 0, trend: [] },
    attendees: { current: 0, change: 0, trend: [] },
    conversion: { current: 0, change: 0, trend: [] },
    satisfaction: { current: 0, change: 0, trend: [] },
    activeEvents: { current: 0, change: 0, trend: [] },
    avgTicket: { current: 0, change: 0, trend: [] },
    scanRate: { current: 0, change: 0, trend: [] },
    refundRate: { current: 0, change: 0, trend: [] },
  });

  // Historical data
  const [historicalData, setHistoricalData] = useState({
    hourly: { revenue: [], labels: [] },
    daily: { revenue: [], labels: [] },
    events: [],
  });

  // API endpoints
  const getDashboardEndpoint = () => {
    return `${apiBaseUrl}/api/event-manager/dashboard`;
  };

  const getEventsEndpoint = () => {
    return `${apiBaseUrl}/api/event-manager/planner/events`;
  };

  const buildWsUrl = () => {
    const baseUrl = apiBaseUrl || getApiBaseUrlSync();
    const wsProtocol = baseUrl.startsWith("https") ? "wss" : "ws";
    const authToken = token || "";
    const wsHost = baseUrl.replace(/^https?:\/\//, "");
    return `${wsProtocol}://${wsHost}/ws/dashboard${authToken ? `?token=${encodeURIComponent(authToken)}` : ""}`;
  };

  const pctChange = (prevValue, nextValue) => {
    const prev = Number(prevValue) || 0;
    const next = Number(nextValue) || 0;
    if (prev <= 0) return next > 0 ? 100 : 0;
    return ((next - prev) / prev) * 100;
  };

  const navigateSafe = (routeName, params) => {
    try {
      if (navigation?.navigate && routeName) {
        navigation.navigate(routeName, params);
        return;
      }
    } catch (e) {
      // fall through
    }
    Alert.alert(
      "Coming Soon",
      `This area is not wired yet: ${routeName || "Unknown"}`,
    );
  };

  const resolveDashboardRouteTarget = (actionOrRoute, params) => {
    const action =
      typeof actionOrRoute === "string"
        ? { route: actionOrRoute, params }
        : actionOrRoute || {};

    const actionKey = action.key || "";
    const routeOverride = HUB_ACTION_ROUTE_OVERRIDES[actionKey];
    const preferredRoute = routeOverride || HUB_ROUTE_ALIASES[action.route] || action.route;
    const fallbackRoute = HUB_MODULE_FALLBACK_ROUTES[action.moduleId];
    const routeName =
      (preferredRoute && REGISTERED_ADMIN_DASHBOARD_ROUTES.has(preferredRoute)
        ? preferredRoute
        : null) || fallbackRoute;

    if (!routeName || !REGISTERED_ADMIN_DASHBOARD_ROUTES.has(routeName)) {
      return null;
    }

    const nextParams = {
      ...(action.params || {}),
      ...(actionKey === "att:manual" ? { lookupMode: true } : {}),
      ...(routeName === fallbackRoute && actionKey
        ? { dashboardIntent: actionKey }
        : {}),
    };

    return {
      routeName,
      params: Object.keys(nextParams).length ? nextParams : undefined,
    };
  };

  const managementModules = [
    {
      id: "events",
      icon: "calendar",
      tint: "#2563eb",
      title: "Events Management",
      subtitle: "Create, publish, schedule, and govern event lifecycle",
      pill: `${opsMetrics.totalEvents || 0} events`,
      groups: [
        {
          title: "Lifecycle",
          actions: [
            {
              key: "events:list",
              icon: "list",
              label: "Event Catalog",
              description: "Browse drafts, upcoming, live, archived",
              route: "EventPlanner",
            },
            {
              key: "events:create",
              icon: "add-circle",
              label: "Create Event",
              description: "New event with venue, images, schedule",
              route: "EventPlanner",
              params: { mode: "create" },
            },
            {
              key: "events:publishing",
              icon: "paper-plane",
              label: "Publishing Controls",
              description: "Draft -> published, visibility, links",
              route: "EventPlanner",
              related: ["comm:announcements"],
            },
          ],
        },
        {
          title: "Capacity",
          actions: [
            {
              key: "events:capacity",
              icon: "speedometer",
              label: "Capacity & Sections",
              description: "Limits, seating sections, allocations",
              route: "EventPlanner",
              related: ["tickets:inventory"],
            },
            {
              key: "events:staffing",
              icon: "people",
              label: "Staff & Access",
              description: "Assign scanners, co-organizers, roles",
              route: "TeamRoles",
              related: ["team:roles"],
            },
          ],
        },
      ],
    },
    {
      id: "tickets",
      icon: "ticket",
      tint: "#7c3aed",
      title: "Tickets & Pricing",
      subtitle: "Ticket types, pricing windows, fees, discounts, add-ons",
      pill: "Pricing",
      groups: [
        {
          title: "Products",
          actions: [
            {
              key: "tickets:types",
              icon: "pricetags",
              label: "Ticket Types",
              description: "General, VIP, Early Bird, Group packs",
              route: "TicketTypes",
              related: ["sales:channels"],
            },
            {
              key: "tickets:addons",
              icon: "bag-handle",
              label: "Add-ons",
              description: "Parking, merch, food vouchers",
              route: "TicketAddons",
            },
          ],
        },
        {
          title: "Controls",
          actions: [
            {
              key: "tickets:inventory",
              icon: "cube",
              label: "Inventory & Limits",
              description: "Quantity, per-person limits, holdback",
              route: "TicketInventory",
              related: ["events:capacity"],
            },
            {
              key: "tickets:discounts",
              icon: "gift",
              label: "Promo Codes",
              description: "Discount codes, access keys, campaigns",
              route: "DiscountCodes",
              related: ["sales:analytics"],
            },
            {
              key: "tickets:refunds",
              icon: "repeat",
              label: "Refund Policy",
              description: "Rules, windows, exceptions",
              route: "RefundPolicy",
              related: ["finance:refunds"],
            },
          ],
        },
      ],
    },
    {
      id: "sales",
      icon: "stats-chart",
      tint: "#16a34a",
      title: "Sales & Analytics",
      subtitle: "Orders, conversion, channel performance, exports & reporting",
      pill: "Insights",
      groups: [
        {
          title: "Orders",
          actions: [
            {
              key: "sales:orders",
              icon: "receipt",
              label: "Orders",
              description: "Search orders, statuses, resend tickets",
              route: "Orders",
              related: ["support:resend"],
            },
            {
              key: "sales:customers",
              icon: "person",
              label: "Customers",
              description: "Buyer profiles, repeat purchasers",
              route: "Customers",
            },
          ],
        },
        {
          title: "Analytics",
          actions: [
            {
              key: "sales:analytics",
              icon: "analytics",
              label: "Dashboards",
              description: "Revenue, conversion, ticket-type breakdown",
              route: "Analytics",
              related: ["tickets:discounts"],
            },
            {
              key: "sales:exports",
              icon: "download",
              label: "Exports",
              description: "CSV/PDF exports for finance & ops",
              route: "Exports",
              related: ["finance:payouts"],
            },
            {
              key: "sales:channels",
              icon: "git-branch",
              label: "Channels",
              description: "Online, mobile, box office, partners",
              route: "Channels",
            },
          ],
        },
      ],
    },
    {
      id: "attendees",
      icon: "qr-code",
      tint: "#f59e0b",
      title: "Attendees & Check-in",
      subtitle:
        "Attendee lists, QR validation, manual check-in, offline readiness",
      pill: "Gate",
      groups: [
        {
          title: "Check-in",
          actions: [
            {
              key: "att:scanner",
              icon: "scan",
              label: "QR Scanner",
              description: "Validate tickets in real-time",
              route: "QRScanner",
              related: ["events:staffing"],
            },
            {
              key: "att:manual",
              icon: "search",
              label: "Manual Lookup",
              description: "Search attendee name/ID when QR fails",
              route: "AttendeeLookup",
            },
          ],
        },
        {
          title: "Attendee Management",
          actions: [
            {
              key: "att:list",
              icon: "people",
              label: "Attendee List",
              description: "Checked-in vs not checked-in",
              route: "Attendees",
            },
            {
              key: "att:offline",
              icon: "cloud-offline",
              label: "Offline Mode",
              description: "Cache lists for low-network venues",
              route: "OfflineTools",
            },
          ],
        },
      ],
    },
    {
      id: "finance",
      icon: "card",
      tint: "#0f766e",
      title: "Payouts & Finance",
      subtitle: "Balances, payouts, refunds, reconciliation and audit trails",
      pill: "Finance",
      groups: [
        {
          title: "Payouts",
          actions: [
            {
              key: "finance:payouts",
              icon: "cash-outline",
              label: "Payouts",
              description: "Schedule, status, settlement history",
              route: "Payouts",
              related: ["sales:exports"],
            },
            {
              key: "finance:bank",
              icon: "business",
              label: "Bank Details",
              description: "KYC / verification & payout accounts",
              route: "BankDetails",
            },
          ],
        },
        {
          title: "Risk",
          actions: [
            {
              key: "finance:refunds",
              icon: "repeat",
              label: "Refunds",
              description: "Issue, track, dispute handling",
              route: "Refunds",
              related: ["tickets:refunds"],
            },
            {
              key: "finance:chargebacks",
              icon: "alert-circle",
              label: "Chargebacks",
              description: "Evidence, deadlines, outcomes",
              route: "Chargebacks",
            },
          ],
        },
      ],
    },
    {
      id: "team",
      icon: "people-circle",
      tint: "#db2777",
      title: "Team & Roles",
      subtitle:
        "Invite staff, permissions, audit logs, operational accountability",
      pill: "Access",
      groups: [
        {
          title: "Access Control",
          actions: [
            {
              key: "team:roles",
              icon: "shield-checkmark",
              label: "Roles & Permissions",
              description: "Scanner-only, editor, finance, admin",
              route: "TeamRoles",
              related: ["att:scanner"],
            },
            {
              key: "team:invites",
              icon: "person-add",
              label: "Invite Staff",
              description: "Invite co-organizers and gate staff",
              route: "TeamInvites",
            },
          ],
        },
        {
          title: "Audit",
          actions: [
            {
              key: "team:activity",
              icon: "time",
              label: "Activity Log",
              description: "Who changed pricing, refunds, publishing",
              route: "ActivityLog",
              related: ["finance:refunds"],
            },
          ],
        },
      ],
    },
    {
      id: "comm",
      icon: "chatbubbles",
      tint: "#1d4ed8",
      title: "Communication",
      subtitle: "Announcements, attendee messages, automation and templates",
      pill: "Comms",
      groups: [
        {
          title: "Messaging",
          actions: [
            {
              key: "comm:messages",
              icon: "mail",
              label: "Message Attendees",
              description: "Email/SMS/push (provider dependent)",
              route: "Messaging",
              related: ["att:list"],
            },
            {
              key: "comm:templates",
              icon: "document-text",
              label: "Templates",
              description: "Reusable templates for common comms",
              route: "Templates",
            },
          ],
        },
        {
          title: "Announcements",
          actions: [
            {
              key: "comm:announcements",
              icon: "megaphone",
              label: "Announcements",
              description: "Time change, venue updates, reminders",
              route: "Announcements",
              related: ["events:publishing"],
            },
            {
              key: "comm:automations",
              icon: "flash",
              label: "Automations",
              description: "Pre-event reminders and post-event followups",
              route: "Automations",
            },
          ],
        },
      ],
    },
    {
      id: "support",
      icon: "help-circle",
      tint: "#64748b",
      title: "Support & Operations",
      subtitle: "Resends, disputes, incident notes, help center and tooling",
      pill: "Ops",
      groups: [
        {
          title: "Tools",
          actions: [
            {
              key: "support:resend",
              icon: "send",
              label: "Resend Tickets",
              description: "Resend QR codes and confirmations",
              route: "ResendTickets",
              related: ["sales:orders"],
            },
            {
              key: "support:issues",
              icon: "bug",
              label: "Issue Triage",
              description: "Scan disputes, duplicate scans, escalations",
              route: "IssueTriage",
              related: ["att:scanner"],
            },
          ],
        },
        {
          title: "Help",
          actions: [
            {
              key: "support:helpcenter",
              icon: "book",
              label: "Help Center",
              description: "Guides, policies, contact support",
              route: "HelpCenter",
            },
          ],
        },
      ],
    },
    {
      id: "settings",
      icon: "settings",
      tint: "#334155",
      title: "Settings",
      subtitle:
        "Branding, fees/taxes, integrations, notifications, organization",
      pill: "Config",
      groups: [
        {
          title: "Organization",
          actions: [
            {
              key: "settings:profile",
              icon: "id-card",
              label: "Organizer Profile",
              description: "Branding, logos, contact identity",
              route: "OrganizerProfile",
            },
            {
              key: "settings:fees",
              icon: "calculator",
              label: "Fees & Taxes",
              description: "Fee rules, tax settings (if supported)",
              route: "FeesTaxes",
            },
          ],
        },
        {
          title: "Integrations",
          actions: [
            {
              key: "settings:integrations",
              icon: "link",
              label: "Integrations",
              description: "Email provider, payments, webhooks",
              route: "Integrations",
            },
            {
              key: "settings:notifications",
              icon: "notifications",
              label: "Notifications",
              description: "Operational alerts and preferences",
              route: "Notifications",
            },
          ],
        },
      ],
    },
  ];

  const onHubNavigate = (action) => {
    if (!action) return;

    const resolvedTarget = resolveDashboardRouteTarget(action);
    const cardId = `hub:${action.key || action.route || "action"}`;

    if (resolvedTarget && resolvedTarget.routeName !== "ManagerDashboard") {
      setActiveCardId(cardId);
      closeEnterpriseModal();
      navigateSafe(resolvedTarget.routeName, resolvedTarget.params);
    } else {
      setCardInspector({
        id: cardId,
        title: action.label || "Management Action",
        subtitle: action.description || "Open focused workspace for this action.",
        context: "Management Hub",
        accent: "#1d4ed8",
        sections: [
          {
            title: "Navigation",
            lines: [
              `Action key: ${action.key || "n/a"}`,
              resolvedTarget?.routeName
                ? `Launches workspace: ${resolvedTarget.routeName}`
                : action.route
                  ? `Configured route: ${action.route}`
                  : "Review action notes before choosing next step",
              action.related?.length
                ? "Related workspaces are available for deeper entry points."
                : "No direct related action configured.",
            ],
          },
        ],
        actions: [
          resolvedTarget?.routeName
            ? `Open ${resolvedTarget.routeName}`
            : action.route
              ? `Review ${action.route}`
              : "Review action notes",
        ],
      });
    }

    // Cross-module depth: offer related deep-links when present
    if (action.related && action.related.length) {
      const relatedTargets = [];
      managementModules.forEach((m) =>
        m.groups.forEach((g) =>
          g.actions.forEach((a) => {
            if (action.related.includes(a.key))
              relatedTargets.push({ module: m, action: a });
          }),
        ),
      );

      if (relatedTargets.length) {
        Alert.alert("Go deeper", "Related areas you may want next:", [
          ...relatedTargets.slice(0, 3).map((t) => ({
            text: `${t.module.title} • ${t.action.label}`,
            onPress: () => onHubNavigate({ ...t.action, moduleId: t.module.id }),
          })),
          { text: "Close", style: "cancel" },
        ]);
      }
    }
  };

  // Fetch dashboard data
  const fetchDashboardData = async () => {
    try {
      const headers = getAuthHeader();

      if (!headers.Authorization) {
        console.warn("No authorization token available");
        useFallbackData();
        return;
      }

      try {
        const metricsResponse = await fetch(`${API_BASE_URL}/api/metrics/dashboard-metrics`, { headers });
        if (metricsResponse.ok) {
          const metricsResult = await metricsResponse.json();
          const summary = metricsResult?.data?.summary || {};
          const eventSummary = metricsResult?.data?.eventSummary || {};
          const financialSummary = metricsResult?.data?.financialSummary || {};
          const operationsSummary = metricsResult?.data?.operationsSummary || {};
          const topEvents = metricsResult?.data?.topEvents || [];
          const pendingEvents = metricsResult?.data?.pendingEvents || [];
          const metrics = metricsResult?.metrics || {};

          const liveEvents = Array.isArray(topEvents) && topEvents.length
            ? topEvents.map((event, index) => normalizeEventForCard(event, index))
            : [];

          if (liveEvents.length) {
            processEventsData({ events: liveEvents });
          }

          const totalRevenue = Number(financialSummary.totalRevenue || metrics.total_revenue || 0);
          const totalTickets = Number(financialSummary.totalTicketsSold || metrics.total_tickets_sold || 0);
          const activeEvents = Number(eventSummary.activeEvents || metrics.active_events || 0);
          const pendingEventCount = Number(eventSummary.pendingEvents || metrics.pending_events || 0);
          const utilizationRate = Number(operationsSummary.utilizationRate || metrics.utilization_rate || 0);
          const topCategories = operationsSummary.topCategories || [];

          setRealTimeMetrics((prev) => ({
            revenue: {
              current: totalRevenue,
              change: pctChange(prev.revenue.current, totalRevenue),
              trend: generateTrendData(totalRevenue, 6),
            },
            attendees: {
              current: totalTickets,
              change: pctChange(prev.attendees.current, totalTickets),
              trend: generateTrendData(totalTickets, 6),
            },
            conversion: {
              current: Number(metrics.conversion_rate || prev.conversion.current || 0),
              change: pctChange(prev.conversion.current, Number(metrics.conversion_rate || prev.conversion.current || 0)),
              trend: generateTrendData(Number(metrics.conversion_rate || prev.conversion.current || 0), 6),
            },
            satisfaction: {
              current: Number(metrics.customer_satisfaction || prev.satisfaction.current || 0),
              change: pctChange(prev.satisfaction.current, Number(metrics.customer_satisfaction || prev.satisfaction.current || 0)),
              trend: generateTrendData(Number(metrics.customer_satisfaction || prev.satisfaction.current || 0), 6),
            },
            activeEvents: {
              current: activeEvents,
              change: pctChange(prev.activeEvents.current, activeEvents),
              trend: generateTrendData(activeEvents, 6),
            },
            avgTicket: {
              current: totalTickets > 0 ? totalRevenue / totalTickets : 0,
              change: pctChange(prev.avgTicket.current, totalTickets > 0 ? totalRevenue / totalTickets : 0),
              trend: generateTrendData(totalTickets > 0 ? totalRevenue / totalTickets : 0, 6),
            },
            scanRate: {
              current: Number(metrics.scan_rate || prev.scanRate.current || 0),
              change: pctChange(prev.scanRate.current, Number(metrics.scan_rate || prev.scanRate.current || 0)),
              trend: generateTrendData(Number(metrics.scan_rate || prev.scanRate.current || 0), 6),
            },
            refundRate: {
              current: Number(metrics.refund_rate || prev.refundRate.current || 0),
              change: pctChange(prev.refundRate.current, Number(metrics.refund_rate || prev.refundRate.current || 0)),
              trend: generateTrendData(Number(metrics.refund_rate || prev.refundRate.current || 0), 6),
            },
          }));

          setHistoricalData((prev) => ({
            ...prev,
            events: liveEvents.length ? liveEvents.slice(0, 6) : (pendingEvents || []).slice(0, 6),
          }));

          setOpsMetrics({
            totalEvents: Number(eventSummary.totalEvents || summary.totalEvents || 0),
            pendingEvents: pendingEventCount,
            archivedEvents: Number(eventSummary.archivedEvents || 0),
            utilizationRate,
            topCategories,
          });

          setDashboardData((prev) => ({
            ...prev,
            totalRevenue,
            totalTickets,
            activeEvents,
            events: liveEvents.length ? liveEvents.slice(0, 4) : (pendingEvents || []).slice(0, 4),
            revenueForecast: buildRevenueForecastFromRevenue(totalRevenue),
            channels: (Array.isArray(topCategories) && topCategories.length)
              ? topCategories.slice(0, 4).map((item, idx) => ({
                  name: item.category || `Category ${idx + 1}`,
                  revenue: Math.round((Number(item.count || 0) / Math.max(1, Number(summary.totalEvents || 1))) * totalRevenue),
                  growth: Math.round((Number(item.count || 0) / Math.max(1, Number(summary.totalEvents || 1))) * 100),
                  color: ['#6366f1', '#8b5cf6', '#10b981', '#f59e0b'][idx % 4],
                }))
              : prev.channels,
          }));

          setLastUpdate(new Date());
          setDataVersion((prev) => prev + 1);
          setLoading(false);
          return;
        }
      } catch (metricsError) {
        console.warn("Metrics endpoint unavailable, falling back to events endpoint:", metricsError?.message || metricsError);
      }

      const eventsEndpoint = getEventsEndpoint();
      const eventsResponse = await fetch(eventsEndpoint, { headers });

      if (eventsResponse.ok) {
        const eventsResult = await eventsResponse.json();
        console.log("Events API response:", eventsResult);

        processEventsData(eventsResult);
        setLastUpdate(new Date());
        setDataVersion((prev) => prev + 1);
      } else {
        console.error("Failed to fetch events:", eventsResponse.status);
        useFallbackData();
      }
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
      useFallbackData();
    }
  };

  // Process events data into dashboard format
  const processEventsData = (eventsResult) => {
    const rawEvents = Array.isArray(eventsResult?.data)
      ? eventsResult.data
      : Array.isArray(eventsResult?.events)
        ? eventsResult.events
        : [];
    const events = rawEvents.map((event, index) =>
      normalizeEventForCard(event, index),
    );
    if (events.length === 0) {
      useFallbackData();
      return;
    }

    // Calculate metrics from events
    const totalRevenue = events.reduce((sum, event) => {
      return sum + asNumber(event.revenue);
    }, 0);

    const totalTickets = events.reduce(
      (sum, event) => sum + asNumber(event.attendees),
      0,
    );
    const activeEvents = events.filter((e) => e.status === "active").length;
    const avgTicketPrice = totalTickets > 0 ? totalRevenue / totalTickets : 0;

    const previous = realTimeMetrics;
    const avgTicketsPerEvent = totalTickets / Math.max(1, events.length);
    const conversionCurrent = Math.min(100, (avgTicketsPerEvent / 500) * 100);
    const scanRateCurrent = Math.min(100, 70 + activeEvents * 3);
    const refundRateCurrent = Math.max(
      0.5,
      Math.min(10, 6 - activeEvents * 0.3),
    );
    const satisfactionCurrent = Math.min(100, 82 + activeEvents * 1.5);

    // Generate deterministic metrics from live data.
    const metrics = {
      revenue: {
        current: totalRevenue,
        change: pctChange(previous.revenue.current, totalRevenue),
        trend: generateTrendData(totalRevenue, 6),
      },
      attendees: {
        current: totalTickets,
        change: pctChange(previous.attendees.current, totalTickets),
        trend: generateTrendData(totalTickets, 6),
      },
      conversion: {
        current: conversionCurrent,
        change: pctChange(previous.conversion.current, conversionCurrent),
        trend: generateTrendData(conversionCurrent, 6),
      },
      satisfaction: {
        current: satisfactionCurrent,
        change: pctChange(previous.satisfaction.current, satisfactionCurrent),
        trend: generateTrendData(satisfactionCurrent, 6),
      },
      activeEvents: {
        current: activeEvents,
        change: pctChange(previous.activeEvents.current, activeEvents),
        trend: generateTrendData(activeEvents, 6),
      },
      avgTicket: {
        current: avgTicketPrice,
        change: pctChange(previous.avgTicket.current, avgTicketPrice),
        trend: generateTrendData(avgTicketPrice, 6),
      },
      scanRate: {
        current: scanRateCurrent,
        change: pctChange(previous.scanRate.current, scanRateCurrent),
        trend: generateTrendData(scanRateCurrent, 6),
      },
      refundRate: {
        current: refundRateCurrent,
        change: pctChange(previous.refundRate.current, refundRateCurrent),
        trend: generateTrendData(refundRateCurrent, 6),
      },
    };

    // Set metrics
    setRealTimeMetrics(metrics);

    // Generate historical data
    const hourlyRevenue = [];
    const hourlyLabels = [];
    const now = new Date();

    for (let i = 7; i >= 0; i--) {
      const hour = new Date(now.getTime() - i * 60 * 60 * 1000);
      hourlyLabels.push(hour.getHours().toString().padStart(2, "0") + ":00");
      const hourlyBase = totalRevenue / 8;
      const ramp = 0.75 + ((7 - i) / 7) * 0.3;
      hourlyRevenue.push(Math.round(hourlyBase * ramp));
    }

    const dailyBase = totalRevenue / 7;
    const dailyRevenue = Array.from({ length: 7 }, (_, idx) => {
      const dayFactor = 0.85 + (idx / 6) * 0.25;
      return Math.round(dailyBase * dayFactor);
    });

    // Set historical data
    setHistoricalData({
      hourly: { revenue: hourlyRevenue, labels: hourlyLabels },
      daily: {
        revenue: dailyRevenue,
        labels: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
      },
      events: events.slice(0, 6), // Show top 6 events
    });

    // Set dashboard data
    setDashboardData({
      totalRevenue,
      totalTickets,
      activeEvents,
      events: events.slice(0, 4), // Top 4 events for cards
      revenueForecast: buildRevenueForecastFromRevenue(totalRevenue),
      channels: [
        {
          name: "Online",
          revenue: Math.round(totalRevenue * 0.5),
          growth: 12,
          color: "#6366f1",
        },
        {
          name: "Mobile",
          revenue: Math.round(totalRevenue * 0.3),
          growth: 25,
          color: "#8b5cf6",
        },
        {
          name: "Box Office",
          revenue: Math.round(totalRevenue * 0.15),
          growth: 8,
          color: "#10b981",
        },
        {
          name: "Partners",
          revenue: Math.round(totalRevenue * 0.05),
          growth: 15,
          color: "#f59e0b",
        },
      ],
    });

    setOpsMetrics(buildOpsMetricsFromEvents(events));

    setLoading(false);
  };

  const applyMetricsFromSocket = (metrics) => {
    if (!metrics) return;

    const revenueCurrent = Number(
      metrics.potentialRevenue ?? metrics.revenueThisHour ?? 0,
    );
    const attendeesCurrent = Number(
      metrics.totalSoldTickets ?? metrics.liveAttendees ?? 0,
    );
    const conversionCurrent = Number(metrics.conversionRate ?? 0);
    const satisfactionCurrent = Number(metrics.customerSatisfaction ?? 0);
    const activeEventsCurrent = Number(
      metrics.activeEventsRightNow ?? metrics.activeEvents ?? 0,
    );
    const avgTicketCurrent = Number(metrics.avgTicketPrice ?? 0);
    const scanRateCurrent = Number(
      metrics.scanRate ?? metrics.utilizationRate ?? 0,
    );
    const refundRateCurrent = Number(
      metrics.refundRate ?? Math.max(0, 100 - scanRateCurrent) / 8,
    );

    setRealTimeMetrics((prev) => ({
      revenue: {
        current: revenueCurrent,
        change: pctChange(prev.revenue.current, revenueCurrent),
        trend: [...(prev.revenue.trend || []).slice(-7), revenueCurrent],
      },
      attendees: {
        current: attendeesCurrent,
        change: pctChange(prev.attendees.current, attendeesCurrent),
        trend: [...(prev.attendees.trend || []).slice(-7), attendeesCurrent],
      },
      conversion: {
        current: conversionCurrent,
        change: pctChange(prev.conversion.current, conversionCurrent),
        trend: [...(prev.conversion.trend || []).slice(-7), conversionCurrent],
      },
      satisfaction: {
        current: satisfactionCurrent,
        change: pctChange(prev.satisfaction.current, satisfactionCurrent),
        trend: [
          ...(prev.satisfaction.trend || []).slice(-7),
          satisfactionCurrent,
        ],
      },
      activeEvents: {
        current: activeEventsCurrent,
        change: pctChange(prev.activeEvents.current, activeEventsCurrent),
        trend: [
          ...(prev.activeEvents.trend || []).slice(-7),
          activeEventsCurrent,
        ],
      },
      avgTicket: {
        current: avgTicketCurrent,
        change: pctChange(prev.avgTicket.current, avgTicketCurrent),
        trend: [...(prev.avgTicket.trend || []).slice(-7), avgTicketCurrent],
      },
      scanRate: {
        current: scanRateCurrent,
        change: pctChange(prev.scanRate.current, scanRateCurrent),
        trend: [...(prev.scanRate.trend || []).slice(-7), scanRateCurrent],
      },
      refundRate: {
        current: refundRateCurrent,
        change: pctChange(prev.refundRate.current, refundRateCurrent),
        trend: [...(prev.refundRate.trend || []).slice(-7), refundRateCurrent],
      },
    }));

    const revenueSeries = Array.isArray(metrics.revenueSeries)
      ? metrics.revenueSeries
      : [];
    const labels = revenueSeries.map((_, idx) => `${idx + 1}h`);
    const recentEvents = Array.isArray(metrics.recentEvents)
      ? metrics.recentEvents
      : [];
    setHistoricalData({
      hourly: { revenue: revenueSeries, labels },
      daily: {
        revenue: revenueSeries.slice(-7),
        labels: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
      },
      events: recentEvents,
    });

    const categoryItems = Array.isArray(metrics.topCategories)
      ? metrics.topCategories
      : [];
    const totalRevenue = revenueCurrent;
    const channels = categoryItems.slice(0, 4).map((item, idx) => ({
      name: item.category || `Category ${idx + 1}`,
      revenue: Math.round(
        (Number(item.count || 0) /
          Math.max(1, Number(metrics.totalEvents || 1))) *
          totalRevenue,
      ),
      growth: Math.round(
        (Number(item.count || 0) /
          Math.max(1, Number(metrics.totalEvents || 1))) *
          100,
      ),
      color: ["#6366f1", "#8b5cf6", "#10b981", "#f59e0b"][idx % 4],
    }));

    setDashboardData({
      totalRevenue,
      totalTickets: attendeesCurrent,
      activeEvents: activeEventsCurrent,
      events: recentEvents.slice(0, 4),
      revenueForecast: buildRevenueForecastFromRevenue(totalRevenue),
      channels,
    });

    setOpsMetrics({
      totalEvents: Number(metrics.totalEvents || 0),
      pendingEvents: Number(metrics.pendingEvents || 0),
      archivedEvents: Number(metrics.archivedEvents || 0),
      utilizationRate: Number(metrics.utilizationRate || 0),
      topCategories: categoryItems,
    });

    setLastUpdate(new Date());
    setDataVersion((prev) => prev + 1);
    setLoading(false);
  };

  // Generate trend data from deterministic inputs.
  const generateTrendData = (currentValue, points) => {
    return generateDeterministicTrend(currentValue, points);
  };

  // Fallback data when API fails
  const useFallbackData = () => {
    const existingRevenue = asNumber(dashboardData?.totalRevenue || realTimeMetrics?.revenue?.current);
    const existingTickets = asNumber(dashboardData?.totalTickets || realTimeMetrics?.attendees?.current);
    const dashboardEvents = Array.isArray(dashboardData?.events) ? dashboardData.events : [];
    const historicalEvents = Array.isArray(historicalData?.events) ? historicalData.events : [];
    const mergedExistingEvents = [...dashboardEvents, ...historicalEvents]
      .filter(Boolean)
      .reduce((acc, event) => {
        const normalized = normalizeEventForCard(event, acc.length);
        if (!acc.find((item) => String(item.id) === String(normalized.id) || item.name === normalized.name)) {
          acc.push(normalized);
        }
        return acc;
      }, [])
      .slice(0, 4);

    const baseRevenue = existingRevenue > 0 ? existingRevenue : 245000;
    const baseTickets = existingTickets > 0 ? existingTickets : 2700;

    const fallbackEvents = mergedExistingEvents.length
      ? mergedExistingEvents
      : [
          {
            id: 1,
            name: "Primary Live Event",
            revenue: Math.round(baseRevenue * 0.35),
            attendees: Math.round(baseTickets * 0.32),
            category: "General",
            status: "active",
            attendanceRate: 90,
          },
          {
            id: 2,
            name: "Secondary Live Event",
            revenue: Math.round(baseRevenue * 0.22),
            attendees: Math.round(baseTickets * 0.24),
            category: "General",
            status: "upcoming",
            attendanceRate: 84,
          },
        ];

    const baseEvents = fallbackEvents.length;
    const derivedAvgTicket = baseTickets > 0 ? baseRevenue / baseTickets : 0;

    const metrics = {
      revenue: {
        current: baseRevenue,
        change: asNumber(realTimeMetrics?.revenue?.change || 0),
        trend: generateTrendData(baseRevenue, 6),
      },
      attendees: {
        current: baseTickets,
        change: asNumber(realTimeMetrics?.attendees?.change || 0),
        trend: generateTrendData(baseTickets, 6),
      },
      conversion: {
        current: asNumber(realTimeMetrics?.conversion?.current || 4.2),
        change: asNumber(realTimeMetrics?.conversion?.change || 0),
        trend: generateTrendData(asNumber(realTimeMetrics?.conversion?.current || 4.2), 6),
      },
      satisfaction: {
        current: asNumber(realTimeMetrics?.satisfaction?.current || 92),
        change: asNumber(realTimeMetrics?.satisfaction?.change || 0),
        trend: generateTrendData(asNumber(realTimeMetrics?.satisfaction?.current || 92), 6),
      },
      activeEvents: {
        current: baseEvents,
        change: asNumber(realTimeMetrics?.activeEvents?.change || 0),
        trend: generateTrendData(baseEvents, 6),
      },
      avgTicket: {
        current: derivedAvgTicket,
        change: asNumber(realTimeMetrics?.avgTicket?.change || 0),
        trend: generateTrendData(derivedAvgTicket, 6),
      },
      scanRate: {
        current: asNumber(realTimeMetrics?.scanRate?.current || 87),
        change: asNumber(realTimeMetrics?.scanRate?.change || 0),
        trend: generateTrendData(asNumber(realTimeMetrics?.scanRate?.current || 87), 6),
      },
      refundRate: {
        current: asNumber(realTimeMetrics?.refundRate?.current || 2.3),
        change: asNumber(realTimeMetrics?.refundRate?.change || 0),
        trend: generateTrendData(asNumber(realTimeMetrics?.refundRate?.current || 2.3), 6),
      },
    };

    setRealTimeMetrics(metrics);

    const fallbackHourlyRevenue = generateTrendData(Math.max(1, baseRevenue / 3), 8).map((value) => Math.round(asNumber(value)));
    const fallbackDailyRevenue = generateTrendData(Math.max(1, baseRevenue), 7).map((value) => Math.round(asNumber(value)));

    setHistoricalData({
      hourly: {
        revenue: fallbackHourlyRevenue,
        labels: [
          "10:00",
          "12:00",
          "14:00",
          "16:00",
          "18:00",
          "20:00",
          "22:00",
          "Now",
        ],
      },
      daily: {
        revenue: fallbackDailyRevenue,
        labels: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
      },
      events: fallbackEvents,
    });

    const fallbackCategoryMap = fallbackEvents.reduce((acc, event) => {
      const category = event?.category || 'General';
      acc[category] = (acc[category] || 0) + 1;
      return acc;
    }, {});

    const derivedFallbackChannels = Object.entries(fallbackCategoryMap)
      .map(([name, count], idx) => ({
        name,
        revenue: Math.round((Number(count || 0) / Math.max(1, fallbackEvents.length)) * baseRevenue),
        growth: Math.round((Number(count || 0) / Math.max(1, fallbackEvents.length)) * 100),
        color: ['#6366f1', '#8b5cf6', '#10b981', '#f59e0b'][idx % 4],
      }))
      .slice(0, 4);

    setDashboardData({
      totalRevenue: baseRevenue,
      totalTickets: baseTickets,
      activeEvents: baseEvents,
      events: fallbackEvents,
      revenueForecast: buildRevenueForecastFromRevenue(baseRevenue),
      channels: derivedFallbackChannels.length
        ? derivedFallbackChannels
        : [
            { name: 'General', revenue: Math.round(baseRevenue * 0.5), growth: 50, color: '#6366f1' },
            { name: 'Secondary', revenue: Math.round(baseRevenue * 0.3), growth: 30, color: '#8b5cf6' },
            { name: 'Operations', revenue: Math.round(baseRevenue * 0.2), growth: 20, color: '#10b981' },
          ],
    });

    setOpsMetrics(buildOpsMetricsFromEvents(fallbackEvents));

    setLoading(false);
  };

  // Initialize data fetch
  useEffect(() => {
    isMountedRef.current = true;
    fetchDashboardData();

    // Animate content in
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start();

    pulseLoopRef.current = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ]),
    );
    pulseLoopRef.current.start();

    return () => {
      isMountedRef.current = false;
      pulseLoopRef.current?.stop();
    };
  }, []);

  // Refetch when auth token is restored after initial mount.
  useEffect(() => {
    if (!token) return;
    fetchDashboardData();
  }, [token, apiBaseUrl]);

  // Live WebSocket feed from backend database metrics
  useEffect(() => {
    if (!token) {
      setWsConnected(false);
      return undefined;
    }

    let reconnectTimer = null;
    let heartbeat = null;
    let shouldReconnect = true;

    const connect = () => {
      if (!isMountedRef.current || !shouldReconnect) return;
      try {
        const ws = new WebSocket(buildWsUrl());
        wsRef.current = ws;

        ws.onopen = () => {
          if (!isMountedRef.current || !shouldReconnect) return;
          setWsConnected(true);
          setWsError("");
          ws.send(JSON.stringify({ type: "request_metrics" }));

          heartbeat = setInterval(() => {
            if (ws.readyState === WebSocket.OPEN) {
              ws.send(JSON.stringify({ type: "ping" }));
            }
          }, 20000);
        };

        ws.onmessage = (event) => {
          try {
            const payload = JSON.parse(event.data);
            if (payload?.type === "metrics_update" && payload?.data?.metrics) {
              applyMetricsFromSocket(payload.data.metrics);
            }
          } catch (err) {
            console.error("WebSocket message parse error:", err);
          }
        };

        ws.onerror = () => {
          if (!isMountedRef.current) return;
          setWsConnected(false);
          setWsError("Live feed interrupted");
        };

        ws.onclose = () => {
          if (!isMountedRef.current) return;
          setWsConnected(false);
          if (heartbeat) clearInterval(heartbeat);
          if (shouldReconnect) {
            reconnectTimer = setTimeout(connect, 4000);
          }
        };
      } catch (err) {
        if (!isMountedRef.current) return;
        setWsConnected(false);
        setWsError("Unable to connect to live feed");
      }
    };

    connect();

    return () => {
      shouldReconnect = false;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      if (heartbeat) clearInterval(heartbeat);
      if (wsRef.current) {
        wsRef.current.onclose = null;
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [token, apiBaseUrl]);

  // Format values
  const formatValue = (value, type) => {
    return formatMetricValue(value, type);
  };

  const asNumber = (value) => {
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric : 0;
  };

  const revenueForecastMultipliers = {
    "1h": 1.15,
    "3h": 1.35,
    "6h": 1.6,
    "24h": 2.2,
    "7d": 5.8,
  };

  const buildRevenueForecastFromRevenue = (sourceRevenue) => {
    const baseline = Math.max(0, asNumber(sourceRevenue));
    const activeEventFactor = Math.max(1, asNumber(realTimeMetrics?.activeEvents?.current || dashboardData?.activeEvents || 1));
    const conversionFactor = Math.max(0.8, Math.min(1.25, asNumber(realTimeMetrics?.conversion?.current || 4) / 5));
    const utilizationFactor = Math.max(0.85, Math.min(1.2, asNumber(opsMetrics?.utilizationRate || 75) / 80));
    const dynamicFactor = Math.max(0.9, Math.min(1.35, ((activeEventFactor / 4) + conversionFactor + utilizationFactor) / 3));

    const entries = Object.entries(revenueForecastMultipliers).map(([period, multiplier]) => {
      const adjustedMultiplier = Math.max(1, multiplier * dynamicFactor);
      return [
        period,
        {
          period,
          baseline,
          multiplier: adjustedMultiplier,
          projectedRevenue: Math.round(baseline * adjustedMultiplier),
          projectedGrowth: Math.round((adjustedMultiplier - 1) * 100),
        },
      ];
    });

    return Object.fromEntries(entries);
  };

  const resolveMetricWithFallback = (metricValue, fallbackValue) => {
    const liveValue = asNumber(metricValue);
    const dbValue = asNumber(fallbackValue);
    return liveValue > 0 ? liveValue : Math.max(liveValue, dbValue);
  };

  const normalizeEventForCard = (event, index) => {
    const ticketPrice = asNumber(event?.ticketPrice);
    const ticketCount = asNumber(event?.ticketsSold);
    const revenueFromTickets = ticketPrice * ticketCount;
    const attendanceRate = asNumber(event?.attendanceRate);

    return {
      id: event?.id ?? index + 1,
      name: event?.name || `Event ${index + 1}`,
      category: event?.category || "General",
      status: event?.status === "active" ? "active" : "upcoming",
      revenue: Math.max(0, asNumber(event?.revenue) || revenueFromTickets),
      attendees: Math.max(0, asNumber(event?.attendees) || ticketCount),
      attendanceRate: Math.max(0, Math.min(100, attendanceRate || 75)),
      shift: event?.shift,
      queue: event?.queue,
      owner: event?.owner,
      open: asNumber(event?.open),
      slaRisk: asNumber(event?.slaRisk),
      breakWindow: event?.breakWindow,
      productivity: asNumber(event?.productivity),
      role: event?.role,
    };
  };

  const buildOpsMetricsFromEvents = (eventsInput) => {
    const safeEvents = (Array.isArray(eventsInput) ? eventsInput : []).map((event, index) =>
      normalizeEventForCard(event, index),
    );

    const totalEvents = safeEvents.length;
    const pendingEvents = safeEvents.filter((event) => {
      const status = String(event?.status || "").toLowerCase();
      return status === "upcoming" || status === "draft" || status === "pending";
    }).length;

    const archivedEvents = safeEvents.filter((event) => {
      const status = String(event?.status || "").toLowerCase();
      return status === "archived" || status === "closed" || status === "completed";
    }).length;

    const categoryMap = {};
    safeEvents.forEach((event) => {
      const category = event?.category || "General";
      categoryMap[category] = (categoryMap[category] || 0) + 1;
    });

    const topCategories = Object.entries(categoryMap)
      .map(([category, count]) => ({
        category,
        count: asNumber(count),
      }))
      .sort((a, b) => b.count - a.count);

    const utilizationRate = safeEvents.length
      ? Math.round(
          safeEvents.reduce((sum, event) => {
            const utilization = asNumber(event?.attendanceRate);
            return sum + Math.max(0, Math.min(100, utilization || 75));
          }, 0) / safeEvents.length,
        )
      : 0;

    return {
      totalEvents,
      pendingEvents,
      archivedEvents,
      utilizationRate: asNumber(utilizationRate),
      topCategories,
    };
  };

  const safeRealTimeMetrics = {
    revenue: {
      current: resolveMetricWithFallback(
        realTimeMetrics?.revenue?.current,
        dashboardData?.totalRevenue,
      ),
      change: asNumber(realTimeMetrics.revenue?.change),
      trend: Array.isArray(realTimeMetrics.revenue?.trend)
        ? realTimeMetrics.revenue.trend
        : [],
    },
    attendees: {
      current: asNumber(realTimeMetrics.attendees?.current),
      change: asNumber(realTimeMetrics.attendees?.change),
      trend: Array.isArray(realTimeMetrics.attendees?.trend)
        ? realTimeMetrics.attendees.trend
        : [],
    },
    conversion: {
      current: asNumber(realTimeMetrics.conversion?.current),
      change: asNumber(realTimeMetrics.conversion?.change),
      trend: Array.isArray(realTimeMetrics.conversion?.trend)
        ? realTimeMetrics.conversion.trend
        : [],
    },
    satisfaction: {
      current: asNumber(realTimeMetrics.satisfaction?.current),
      change: asNumber(realTimeMetrics.satisfaction?.change),
      trend: Array.isArray(realTimeMetrics.satisfaction?.trend)
        ? realTimeMetrics.satisfaction.trend
        : [],
    },
    activeEvents: {
      current: asNumber(realTimeMetrics.activeEvents?.current),
      change: asNumber(realTimeMetrics.activeEvents?.change),
      trend: Array.isArray(realTimeMetrics.activeEvents?.trend)
        ? realTimeMetrics.activeEvents.trend
        : [],
    },
    avgTicket: {
      current: asNumber(realTimeMetrics.avgTicket?.current),
      change: asNumber(realTimeMetrics.avgTicket?.change),
      trend: Array.isArray(realTimeMetrics.avgTicket?.trend)
        ? realTimeMetrics.avgTicket.trend
        : [],
    },
    scanRate: {
      current: asNumber(realTimeMetrics.scanRate?.current),
      change: asNumber(realTimeMetrics.scanRate?.change),
      trend: Array.isArray(realTimeMetrics.scanRate?.trend)
        ? realTimeMetrics.scanRate.trend
        : [],
    },
    refundRate: {
      current: asNumber(realTimeMetrics.refundRate?.current),
      change: asNumber(realTimeMetrics.refundRate?.change),
      trend: Array.isArray(realTimeMetrics.refundRate?.trend)
        ? realTimeMetrics.refundRate.trend
        : [],
    },
  };

  const safeRevenueForecast: Record<
    string,
    { currentRevenue: number; projectedRevenue: number; projectedGrowth: number }
  > = {};
  const computedRevenueForecast = buildRevenueForecastFromRevenue(
    safeRealTimeMetrics.revenue.current,
  );
  ["1h", "3h", "6h", "24h", "7d"].forEach((period) => {
    const periodSource =
      dashboardData?.revenueForecast?.[period] ||
      computedRevenueForecast?.[period] ||
      {};
    const baseline = asNumber(
      periodSource.baseline > 0
        ? periodSource.baseline
        : safeRealTimeMetrics.revenue.current,
    );
    const multiplier = asNumber(
      periodSource.multiplier > 0
        ? periodSource.multiplier
        : computedRevenueForecast?.[period]?.multiplier ||
            revenueForecastMultipliers[period],
    );

    const configuredProjection = asNumber(periodSource.projectedRevenue);
    const fallbackProjection = Math.round(Math.max(0, baseline * multiplier));
    const configuredGrowth = asNumber(periodSource.projectedGrowth);
    const fallbackGrowth = Math.round((multiplier - 1) * 100);

    safeRevenueForecast[period] = {
      currentRevenue: baseline,
      projectedRevenue: configuredProjection || fallbackProjection,
      projectedGrowth: configuredGrowth || fallbackGrowth,
    };
  });

  const getFreshnessLabel = (dateValue) => {
    if (!dateValue) return "Updated just now";
    const elapsedMs = Date.now() - new Date(dateValue).getTime();
    const elapsedMinutes = Math.max(0, Math.floor(elapsedMs / 60000));
    if (elapsedMinutes < 1) return "Updated just now";
    if (elapsedMinutes < 60) return `Updated ${elapsedMinutes}m ago`;
    const elapsedHours = Math.floor(elapsedMinutes / 60);
    return `Updated ${elapsedHours}h ago`;
  };

  // Handle metric click
  const handleMetricClick = (metric) => {
    const metricData = safeRealTimeMetrics[metric];
    if (!metricData) return;

    const metricLabels = {
      revenue: "Total Revenue",
      attendees: "Active Attendees",
      conversion: "Conversion Rate",
      satisfaction: "Customer Satisfaction",
      activeEvents: "Active Events",
      avgTicket: "Average Ticket Price",
      scanRate: "Ticket Scan Rate",
      refundRate: "Refund Rate",
    };

    const metricMeta = {
      revenue: { label: "Total Revenue", color: "#22c55e", format: "currency" },
      attendees: { label: "Active Attendees", color: "#6366f1", format: "number" },
      conversion: { label: "Conversion Rate", color: "#8b5cf6", format: "percentage" },
      satisfaction: { label: "Customer Satisfaction", color: "#f59e0b", format: "percentage" },
      activeEvents: { label: "Active Events", color: "#14b8a6", format: "number" },
      avgTicket: { label: "Average Ticket Price", color: "#10b981", format: "currency" },
      scanRate: { label: "Scan Rate", color: "#3b82f6", format: "percentage" },
      refundRate: { label: "Refund Rate", color: "#ef4444", format: "percentage" },
    };

    const metricMetaValue = metricMeta[metric] || {
      label: "Metric",
      color: "#6366f1",
      format: "number",
    };
    const trendData = Array.isArray(metricData.trend)
      ? metricData.trend
      : [];
    const peakTrend =
      trendData.length > 0
        ? Math.max(...trendData)
        : null;
    const troughTrend =
      trendData.length > 0
        ? Math.min(...trendData)
        : null;

    setCardInspector({
      id: `kpi:${metric}`,
      title: metricMetaValue.label,
      subtitle:
        `Current: ${formatValue(metricData.current, metricMetaValue.format)}` +
        ` • Trend: ${metricData.change >= 0 ? "+" : ""}${metricData.change.toFixed(1)}%`,
      context: "KPI",
      accent: metricMetaValue.color,
      keyMetrics: [
        {
          label: "Current",
          value: `${formatValue(metricData.current, metricMetaValue.format)}`,
        },
        {
          label: "Trend",
          value: `${metricData.change >= 0 ? "+" : ""}${metricData.change.toFixed(
            1,
          )}%`,
        },
        {
          label: "History points",
          value: `${trendData.length}`,
        },
        ...(peakTrend !== null && troughTrend !== null
          ? [
              {
                label: "Trend range",
                value: `${troughTrend.toFixed(2)} - ${peakTrend.toFixed(2)}`,
              },
            ]
          : []),
      ],
      highlights: [
        `Current period label: ${metricLabels[metric] || metric}`,
        `Last updated: ${lastUpdate ? formatShortTime(lastUpdate) : "Live"}`,
        `Live data source: ${selectedPeriod} window`,
      ],
      actions: [
        "Open detailed chart for this KPI",
        "Inspect cross-metric projection",
      ],
    });
  };

  const openEnterpriseModal = ({
    title,
    subtitle = "",
    tag = "Info",
    sections = [],
  }) => {
    setEnterpriseModal({
      visible: true,
      title,
      subtitle,
      tag,
      sections,
    });
  };

  const closeEnterpriseModal = () => {
    setEnterpriseModal((prev) => ({ ...prev, visible: false }));
  };

  const setCardInspector = ({
    id = "",
    title,
    subtitle = "",
    context = "Overview",
    accent = "#6366f1",
    keyMetrics = [],
    highlights = [],
    actions = [],
    sections = [],
  }) => {
    setActiveCardId(id);
    const metricSection =
      keyMetrics.length > 0
        ? [
            {
              title: "Key Metrics",
              lines: keyMetrics.map(
                (metric) => `${metric.label}: ${metric.value}`,
              ),
            },
          ]
        : [];
    const highlightSection =
      highlights.length > 0
        ? [{ title: "Highlights", lines: highlights }]
        : [];
    const actionSection =
      actions.length > 0
        ? [{ title: "Suggested Actions", lines: actions }]
        : [];
    const normalizedSections = [
      ...(Array.isArray(sections) ? sections : []).filter(
        (section) => section && (section.lines || []).length > 0,
      ),
      ...metricSection,
      ...highlightSection,
      ...actionSection,
    ];

    openEnterpriseModal({
      title,
      subtitle,
      tag: context,
      sections: normalizedSections,
    });
  };

  const safeOpsMetrics = {
    totalEvents: asNumber(opsMetrics.totalEvents),
    pendingEvents: asNumber(opsMetrics.pendingEvents),
    archivedEvents: asNumber(opsMetrics.archivedEvents),
    utilizationRate: asNumber(opsMetrics.utilizationRate),
    topCategories: (Array.isArray(opsMetrics.topCategories)
      ? opsMetrics.topCategories
      : []
    ).map((item, index) => ({
      category:
        typeof item?.category === "string" && item.category.trim()
          ? item.category
          : `Category ${index + 1}`,
      count: asNumber(item?.count),
    })),
  };

  const handleOpsCardPress = (card) => {
    const map = {
      totalEvents: {
        title: "Total Events Command Summary",
        subtitle: `${formatMetricValue(safeOpsMetrics.totalEvents, "number")} total events currently under governance.`,
        tag: "Operations",
        sections: [
          { title: "Pipeline", lines: ["Draft: 14", "Active: 8", "Archived: 23"] },
          { title: "Risk Snapshot", lines: ["2 events require staffing boost", "0 critical blockers"] },
        ],
      },
      pendingReview: {
        title: "Pending Review Queue",
        subtitle: `${formatMetricValue(safeOpsMetrics.pendingEvents, "number")} events are waiting for review decisions.`,
        tag: "Governance",
        sections: [
          { title: "Age Buckets", lines: ["<24h: 5", "24-72h: 8", ">72h: 3"] },
          { title: "Action", lines: ["Prioritize aged items", "Apply SLA enforcement"] },
        ],
      },
      archived: {
        title: "Archived Events Ledger",
        subtitle: `${formatMetricValue(
          safeOpsMetrics.archivedEvents,
          "number",
        )} events archived with full audit trace.`,
        tag: "Archive",
        sections: [
          { title: "Retention", lines: ["Policy: 18 months", "Export-ready: 100%"] },
          { title: "Recovery", lines: ["Restorable by role-based approval"] },
        ],
      },
      utilization: {
        title: "Capacity Utilization Analysis",
        subtitle: `Current utilization is ${safeOpsMetrics.utilizationRate.toFixed(1)}%.`,
        tag: "Performance",
        sections: [
          { title: "Benchmarks", lines: ["Target: 82%", "Peak threshold: 92%"] },
          { title: "Recommendation", lines: ["Adjust queue distribution for high-load windows"] },
        ],
      },
    };

    const payload = map[card];
    if (!payload) return;
    setCardInspector({
      id: `ops:${card}`,
      title: payload.title,
      subtitle: payload.subtitle,
      context: "Operations",
      accent: "#2563eb",
      sections: payload.sections,
      actions: ["Run operations drill-down", "Review controls", "Export operations snapshot"],
    });
  };

  const handleCategoryChipPress = (item) => {
    const safeCategory = item?.category || "General";
    const safeCategoryCount = asNumber(item?.count);
    setCardInspector({
      id: `category:${safeCategory}`,
      title: `Category Intelligence — ${safeCategory}`,
      subtitle: `${formatMetricValue(safeCategoryCount, "number")} events match this category.`,
      context: "Operations",
      accent: "#8b5cf6",
      keyMetrics: [
        { label: "Events", value: formatMetricValue(safeCategoryCount, "number") },
        { label: "Trend", value: "Stable" },
        {
          label: "Priority",
          value: safeCategoryCount >= 10 ? "High" : "Standard",
        },
      ],
      highlights: [
        "Campaign budget review recommended for top categories.",
        "Keep an eye on event lifecycle conversion.",
      ],
      actions: ["Open category workspace", "Adjust budget weighting", "Export category report"],
    });
  };

  const handleQuickActionPress = (action) => {
    if (action === "planner") {
      setActiveCardId("quick:planner");
      navigateSafe("Planner", { dashboardIntent: "support-ops-workspace" });
      return;
    }
    if (action === "streams") {
      setCardInspector({
        id: "quick:streams",
        title: "Data Streams Health",
        subtitle: `Version ${dataVersion} | ${wsConnected ? "Connected" : "Degraded"} stream topology`,
        context: "Telemetry",
        accent: "#0ea5e9",
        keyMetrics: [
          {
            label: "Stream status",
            value: wsConnected ? "Connected" : "Degraded",
          },
          {
            label: "WS URL",
            value: buildWsUrl(),
          },
          { label: "Version", value: `${dataVersion}` },
        ],
        highlights: [
          "Telemetry is fed from WebSocket + REST fallback.",
          "Reconnections automatically retry when signal degrades.",
          "Use this panel before planning urgent operational moves.",
        ],
        actions: ["Open stream diagnostics", "Force refresh dashboard", "Check transport errors"],
        sections: [
          {
            title: "Ingestion",
            lines: ["WebSocket metrics feed", "Planner API sync", "Auth gateway checks"],
          },
          { title: "Reliability", lines: [wsError || "No active transport incidents"] },
        ],
      });
      return;
    }
    if (action === "sync") {
      setCardInspector({
        id: "quick:sync",
        title: "Sync Data",
        subtitle:
          "Manually trigger a full dashboard refresh from backend APIs and websocket state.",
        context: "Operations",
        accent: "#0f766e",
        keyMetrics: [
          { label: "Data source", value: "Event + live metrics endpoints" },
          { label: "Status", value: wsConnected ? "Connected" : "Retrying" },
          { label: "Current data version", value: `v${dataVersion}` },
        ],
        highlights: [
          "Data refresh will update top cards, charts, and event grid.",
          "Last successful fetch and websocket events may differ by a few seconds.",
        ],
        actions: ["Sync now", "Review active connections", "Open transport logs"],
      });
      fetchDashboardData();
      return;
    }
  };

  // Handle period selection
  const handlePeriodSelect = (period) => {
    setSelectedPeriod(period);
    Alert.alert(
      "Projection Window Updated",
      `Dashboard forecast horizon switched to ${period}.`,
      [{ text: "OK" }],
    );
  };

  const supportOpsSummary = {
    teamOnShift: Math.max(4, Math.min(24, Math.round((asNumber(opsMetrics?.pendingEvents || 0) * 1.5) + Math.max(3, asNumber(opsMetrics?.topCategories?.length || 0)) + 2))),
    activeQueues: Math.max(0, Math.min(6, asNumber(opsMetrics?.topCategories?.length || 0) || 3)),
    slaHitRate: Math.max(0, Math.min(100, 88 + Math.round(asNumber(opsMetrics?.utilizationRate || 0) / 10))),
    avgResponseMin: Math.max(1, Number((6 - Math.min(4, asNumber(opsMetrics?.pendingEvents || 0) * 0.4)).toFixed(1))),
    breaksActive: Math.max(0, Math.min(4, Math.round(Math.max(4, Math.min(24, Math.round((asNumber(opsMetrics?.pendingEvents || 0) * 1.5) + Math.max(3, asNumber(opsMetrics?.topCategories?.length || 0)) + 2))) / 6))),
    occupancyRate: Math.max(0, Math.min(100, asNumber(opsMetrics?.utilizationRate || 78))),
  };

  const derivedQueueNames = (Array.isArray(opsMetrics?.topCategories) && opsMetrics.topCategories.length
    ? opsMetrics.topCategories.map((item) => item?.category || 'General')
    : ['General', 'Escalations', 'Events']).slice(0, 4);

  const supportShiftBoard = derivedQueueNames.map((queueName, index) => ({
    name: `Consultant ${index + 1}`,
    role: index === 0 ? 'Shift Lead' : index === 1 ? 'Senior Consultant' : 'Consultant',
    shift: index < 2 ? '06:00 - 14:00' : '08:00 - 16:00',
    queue: queueName,
    productivity: Math.max(72, Math.min(99, Math.round(asNumber(supportOpsSummary.occupancyRate) + (index === 0 ? 8 : 2 - index)))),
    status: index === 1 && supportOpsSummary.breaksActive > 0 ? 'On Break' : index === 3 ? 'Training' : 'Online',
    breakWindow: index === 0 ? '10:15 - 10:30' : index === 1 ? '11:00 - 11:15' : index === 2 ? '12:20 - 12:35' : '13:10 - 13:25',
  }));

  const supportQueueBoard = derivedQueueNames.map((queueName, index) => ({
    name: queueName,
    open: Math.max(0, Math.round((asNumber(supportOpsSummary.teamOnShift) * 2.2) - index * 4)),
    slaRisk: Math.max(1, Math.min(4, index + 1)),
    owner: supportShiftBoard[index]?.name || `Consultant ${index + 1}`,
  }));

  const supportBreakCompliance = [
    { metric: 'Break Adherence', value: `${Math.max(80, Math.min(99, 100 - supportOpsSummary.breaksActive * 2)).toFixed(1)}%`, tone: supportOpsSummary.breaksActive > 2 ? 'warn' : 'good' },
    { metric: 'Missed Breaks', value: `${Math.max(0, supportOpsSummary.breaksActive - 1)}`, tone: supportOpsSummary.breaksActive > 2 ? 'warn' : 'good' },
    { metric: 'Overtime Alerts', value: `${Math.max(0, asNumber(opsMetrics?.pendingEvents || 0) > 2 ? 1 : 0)}`, tone: asNumber(opsMetrics?.pendingEvents || 0) > 2 ? 'warn' : 'good' },
    { metric: 'Coverage Gaps', value: `${Math.max(0, derivedQueueNames.length - supportShiftBoard.length)}`, tone: derivedQueueNames.length > supportShiftBoard.length ? 'warn' : 'good' },
  ];

  const safeSupportOpsSummary = {
    teamOnShift: asNumber(supportOpsSummary.teamOnShift),
    activeQueues: asNumber(supportOpsSummary.activeQueues),
    slaHitRate: asNumber(supportOpsSummary.slaHitRate),
    avgResponseMin: asNumber(supportOpsSummary.avgResponseMin),
    breaksActive: asNumber(supportOpsSummary.breaksActive),
    occupancyRate: asNumber(supportOpsSummary.occupancyRate),
  };

  const safeSupportShiftBoard = (Array.isArray(supportShiftBoard)
    ? supportShiftBoard
    : []
  ).map((agent, index) => ({
    name: agent?.name || `Agent ${index + 1}`,
    role: agent?.role || "Agent",
    shift: agent?.shift || "Unassigned",
    queue: agent?.queue || "General",
    productivity: asNumber(agent?.productivity),
    status: agent?.status || "Offline",
    breakWindow: agent?.breakWindow || "Unscheduled",
  }));

  const safeSupportQueueBoard = (Array.isArray(supportQueueBoard)
    ? supportQueueBoard
    : []
  ).map((queue, index) => ({
    name: queue?.name || `Queue ${index + 1}`,
    open: asNumber(queue?.open),
    slaRisk: asNumber(queue?.slaRisk),
    owner: queue?.owner || "Unassigned",
  }));

  const safeSupportBreakCompliance = (Array.isArray(supportBreakCompliance)
    ? supportBreakCompliance
    : []
  ).map((item) => ({
    metric: item?.metric || "Compliance item",
    value: item?.value || "N/A",
    tone: item?.tone === "warn" ? "warn" : "good",
  }));

  const getAgentStatusStyle = (status) => {
    if (status === "Online") return styles.supportStatusOnline;
    if (status === "On Break") return styles.supportStatusBreak;
    if (status === "Training") return styles.supportStatusTraining;
    return styles.supportStatusOffline;
  };

  const setSupportDetailView = ({
    title,
    subtitle,
    level = "Info",
    highlights = [],
    actions = [],
  }) => {
    setCardInspector({
      id: `support:${title}`,
      title,
      subtitle,
      context: level,
      accent: "#1d4ed8",
      sections: [
        { title: "Confidence", lines: [`${highlights.length} signals`] },
        { title: "Recommendations", lines: [`${actions.length} actions available`] },
      ],
      highlights,
      actions,
    });
  };

  const handleSupportMetricPress = (metricKey) => {
    if (metricKey === "teamOnShift") {
      setSupportDetailView({
        title: "Team On Shift",
        subtitle: `${safeSupportOpsSummary.teamOnShift} agents online, ${safeSupportOpsSummary.breaksActive} on break, occupancy ${safeSupportOpsSummary.occupancyRate.toFixed(1)}%.`,
        level: "Operational",
        highlights: [
          `${safeSupportOpsSummary.activeQueues} active queues currently mapped to available coverage`,
          `${safeSupportShiftBoard.filter((agent) => agent.status === 'Online').length} consultants marked online right now`,
          `${safeSupportQueueBoard.filter((queue) => queue.owner && queue.owner !== 'Unassigned').length} queues currently have named owners`,
        ],
        actions: ["Adjust roster", "Approve overtime", "Open workforce planner"],
      });
      return;
    }
    if (metricKey === "activeQueues") {
      setSupportDetailView({
        title: "Active Queues",
        subtitle: `${safeSupportOpsSummary.activeQueues} channels under monitoring with weighted SLA routing.`,
        level: "Routing",
        highlights: [
          `${safeSupportQueueBoard[0]?.name || 'Primary queue'} currently carries the heaviest visible load`,
          "Priority + sentiment + age routing enabled",
          `${safeSupportQueueBoard[0]?.owner || 'Shift lead'} is the current escalation owner`,
        ],
        actions: ["Rebalance queues", "Force reroute", "Review escalation matrix"],
      });
      return;
    }
    if (metricKey === "slaHitRate") {
    setSupportDetailView({
      title: "SLA Hit Rate",
      subtitle: `${safeSupportOpsSummary.slaHitRate.toFixed(1)}% against 92% target.`,
      level: "Performance",
        highlights: [
          `${safeSupportQueueBoard.filter((queue) => queue.slaRisk >= 3).length} queues are currently in elevated SLA risk bands`,
          `${safeSupportOpsSummary.avgResponseMin.toFixed(1)} minutes is the current average first response time`,
          `${safeSupportBreakCompliance.find((item) => item.metric === 'Coverage Gaps')?.value || '0'} coverage gaps recorded in the current support posture`,
        ],
        actions: ["Inspect breaches", "Run root-cause review", "Issue corrective plan"],
      });
      return;
    }
    setSupportDetailView({
      title: "Average First Response",
      subtitle: `${safeSupportOpsSummary.avgResponseMin.toFixed(1)} minutes average response time.`,
      level: "Efficiency",
      highlights: [
        `${safeSupportOpsSummary.avgResponseMin <= 5 ? 'Target maintained below 5.0 minutes' : 'Response target currently above 5.0 minutes'}`,
        `Most stable visible queue: ${safeSupportQueueBoard[safeSupportQueueBoard.length - 1]?.name || 'General'}`,
        `Optimization path: rebalance ${safeSupportQueueBoard[0]?.name || 'primary queue'} coverage during the next review window`,
      ],
      actions: ["Tune auto-routing", "Reassign standby", "Open response analytics"],
    });
  };

  const handleSupportAgentPress = (agent) => {
    const safeAgent = {
      name: agent?.name || "Unknown Agent",
      role: agent?.role || "Agent",
      status: agent?.status || "Offline",
      shift: agent?.shift || "Unassigned",
      queue: agent?.queue || "General",
      productivity: asNumber(agent?.productivity),
      breakWindow: agent?.breakWindow || "Unscheduled",
    };

    setSupportDetailView({
      title: `${safeAgent.name} • ${safeAgent.role}`,
      subtitle: `${safeAgent.status} | Shift ${safeAgent.shift} | Queue: ${safeAgent.queue}`,
      level: "Agent Profile",
      highlights: [
        `Productivity score: ${safeAgent.productivity}%`,
        `Planned break window: ${safeAgent.breakWindow}`,
        `Current queue load reference: ${safeSupportQueueBoard.find((queue) => queue.name === safeAgent.queue)?.open || 0} open items`,
      ],
      actions: ["Open performance log", "Assign coaching", "Reassign queue"],
    });
  };

  const handleSupportQueuePress = (queue) => {
    const safeQueue = {
      name: queue?.name || "Unnamed queue",
      open: asNumber(queue?.open),
      slaRisk: asNumber(queue?.slaRisk),
      owner: queue?.owner || "Unassigned",
    };

    const slaRiskPct = Math.min(
      100,
      Math.round((safeQueue.slaRisk / Math.max(1, safeQueue.open)) * 100),
    );
    setSupportDetailView({
      title: `${safeQueue.name} Queue`,
      subtitle: `${safeQueue.open} open conversations | ${safeQueue.slaRisk} at-risk | Owner: ${safeQueue.owner}`,
      level: "Queue Health",
      highlights: [
        `At-risk ratio: ${slaRiskPct}%`,
        `Recommended action: ${slaRiskPct >= 25 ? 'rebalance with cross-trained standby agents' : 'maintain current staffing and monitor queue age'}`,
        `Escalation owner currently mapped to ${safeQueue.owner}`,
      ],
      actions: ["Rebalance now", "Escalate incidents", "Inspect backlog"],
    });
  };

  const handleSupportCompliancePress = (item) => {
    const safeItem = {
      metric: item?.metric || "Compliance item",
      value: item?.value || "N/A",
      tone: item?.tone === "warn" ? "warn" : "good",
    };

    const guidance =
      safeItem.tone === "good"
        ? `Status healthy. Current occupancy is ${safeSupportOpsSummary.occupancyRate.toFixed(1)}% with ${safeSupportOpsSummary.breaksActive} breaks active.`
        : `Requires attention. ${safeSupportOpsSummary.activeQueues} queues are active and ${safeSupportOpsSummary.breaksActive} breaks are currently in motion.`;

    setSupportDetailView({
      title: safeItem.metric,
      subtitle: `Current value: ${safeItem.value} | Risk: ${
        safeItem.tone === "good" ? "Low" : "Moderate"
      }`,
      level: "Compliance",
      highlights: [
        guidance,
        "Policy source: Workforce operations governance v2.4",
        "Audit cadence: every 4 hours during active shifts",
      ],
      actions: ["Open compliance report", "Notify shift lead", "Create follow-up task"],
    });
  };

  const handleTopEventPress = (event, index) => {
    const eventStatus = event?.status === "active" ? "Live" : "Upcoming";
    const category = event?.category || "General";
    setCardInspector({
      id: `top-event:${event?.id || index}`,
      title: event?.name || `Event ${index + 1}`,
      subtitle: `${eventStatus} event in ${category} with demand context and operations snapshots.`,
      context: "Events",
      accent: eventStatus === "Live" ? "#10b981" : "#f59e0b",
      keyMetrics: [
        {
          label: "Revenue",
          value: formatZarCurrency(event?.revenue || 0),
        },
        {
          label: "Attendees",
          value: formatMetricValue(
            event?.attendees || event?.ticketsSold || 0,
            "number",
          ),
        },
        {
          label: "Attendance rate",
          value: `${event?.attendanceRate || 75}%`,
        },
      ],
      highlights: [
        `Category: ${category}`,
        `Position: #${index + 1} by current revenue`,
        `Latest trend health: ${event?.attendanceRate >= 80 ? "Strong" : "Watch"}`,
      ],
      actions: ["Open event detail", "Review revenue trajectory", "Inspect attendee behavior"],
      sections: [
        {
          title: "Performance",
          lines: [
            `Revenue: ${formatZarCurrency(event?.revenue || 0)}`,
            `Attendees: ${formatMetricValue(
              event?.attendees || event?.ticketsSold || 0,
              "number",
            )}`,
            `Attendance rate: ${event?.attendanceRate || 75}%`,
          ],
        },
        {
          title: "Operations",
          lines: [
            `Category: ${category}`,
            `Status: ${eventStatus}`,
            `Rank: #${index + 1} by revenue`,
          ],
        },
      ],
    });
  };
  const handleKpiCarouselLayout = (event) => {
    const nextWidth = Math.max(320, Math.round(event.nativeEvent.layout.width));
    if (nextWidth !== kpiCarouselWidth) {
      setKpiCarouselWidth(nextWidth);
    }
  };

  const getKpiSlideWidth = () => {
    const visibleCards = isMobileViewport ? 1 : isCompactViewport ? 2 : KPI_VISIBLE_CARDS;
    if (!kpiCarouselWidth) return 220;
    return Math.max(
      170,
      Math.floor(
        (kpiCarouselWidth - KPI_CARD_GAP * (visibleCards - 1)) / visibleCards,
      ),
    );
  };

  const getKpiSlideStep = () => getKpiSlideWidth() + KPI_CARD_GAP;

  const handleKpiCarouselScrollEnd = (event, length) => {
    const nextIndex = Math.round(
      event.nativeEvent.contentOffset.x / getKpiSlideStep(),
    );
    const clampedIndex = Math.max(0, Math.min(length - 1, nextIndex));
    kpiUserInteractingRef.current = false;
    setKpiCarouselIndex(clampedIndex);
  };

  const goToKpiSlide = (index, length) => {
    if (!kpiCarouselRef.current) return;
    const clampedIndex = Math.max(0, Math.min(length - 1, index));
    kpiCarouselRef.current.scrollTo({
      x: clampedIndex * getKpiSlideStep(),
      animated: true,
    });
    setKpiCarouselIndex(clampedIndex);
  };

  const goToNextKpiSlide = (length) => {
    if (!length) return;
    const nextIndex = (kpiCarouselIndex + 1) % length;
    goToKpiSlide(nextIndex, length);
  };

  const goToPrevKpiSlide = (length) => {
    if (!length) return;
    const nextIndex = (kpiCarouselIndex - 1 + length) % length;
    goToKpiSlide(nextIndex, length);
  };

  // Auto-play carousel and loop to start when the end is reached.
  useEffect(() => {
    if (
      loading ||
      !kpiCarouselWidth ||
      !kpiCarouselRef.current ||
      isMobileViewport ||
      isKpiCarouselHovered
    ) {
      return undefined;
    }

    const intervalId = setInterval(() => {
      if (kpiUserInteractingRef.current) return;

      setKpiCarouselIndex((prevIndex) => {
        const length = SECONDARY_KPI_COUNT;
        if (!length) return 0;
        const nextIndex = (prevIndex + 1) % length;
        kpiCarouselRef.current?.scrollTo({
          x: nextIndex * getKpiSlideStep(),
          animated: true,
        });
        return nextIndex;
      });
    }, KPI_AUTOPLAY_MS);

    return () => clearInterval(intervalId);
  }, [
    loading,
    kpiCarouselWidth,
    isMobileViewport,
    isKpiCarouselHovered,
    SECONDARY_KPI_COUNT,
  ]);

  // Calculate top performing events
  const getTopEvents = () => {
    if (!historicalData.events || historicalData.events.length === 0) return [];
    return [...historicalData.events]
      .map((event, index) => normalizeEventForCard(event, index))
      .sort((a, b) => (b.revenue || 0) - (a.revenue || 0))
      .slice(0, 4);
  };

  // Calculate peak hours
  const calculatePeakHours = () => {
    const hourlyRevenue = historicalData.hourly.revenue;
    if (!hourlyRevenue || hourlyRevenue.length === 0) return "7 PM";

    const maxIndex = hourlyRevenue.indexOf(Math.max(...hourlyRevenue));
    const labels = historicalData.hourly.labels;

    if (labels && labels[maxIndex]) {
      return labels[maxIndex];
    }

    const hour = (maxIndex + 10) % 24;
    return `${hour}:00`;
  };

  if (loading) {
    return (
      <ScreenContainer>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#6366f1" />
          <Text style={styles.loadingText}>Loading Dashboard</Text>
          <Text style={styles.loadingSubtext}>Fetching real-time data...</Text>
          <View style={styles.loadingSkeletonRow}>
            <View style={styles.loadingSkeletonCard} />
            <View style={styles.loadingSkeletonCard} />
            <View style={styles.loadingSkeletonCard} />
          </View>
          <TouchableOpacity
            style={styles.loadingRetry}
            onPress={fetchDashboardData}
            accessibilityRole="button"
            accessibilityLabel="Retry dashboard fetch"
          >
            <Text style={styles.loadingRetryText}>Retry now</Text>
          </TouchableOpacity>
        </View>
      </ScreenContainer>
    );
  }

  const topEvents = getTopEvents();
  const peakHours = calculatePeakHours();
  const kpiCarouselCards = [
    {
      key: "revenue",
      icon: "cash",
      label: "Total Revenue",
      value: formatValue(safeRealTimeMetrics.revenue.current, "revenue"),
      change: safeRealTimeMetrics.revenue.change,
      color: "#22c55e",
      subtitle: "Today",
      trendData: safeRealTimeMetrics.revenue.trend,
    },
    {
      key: "attendees",
      icon: "people",
      label: "Active Attendees",
      value: formatValue(safeRealTimeMetrics.attendees.current, "number"),
      change: safeRealTimeMetrics.attendees.change,
      color: "#6366f1",
      subtitle: "Currently attending",
      trendData: safeRealTimeMetrics.attendees.trend,
    },
    {
      key: "conversion",
      icon: "trending-up",
      label: "Conversion Rate",
      value: formatValue(safeRealTimeMetrics.conversion.current, "percentage"),
      change: safeRealTimeMetrics.conversion.change,
      color: "#8b5cf6",
      subtitle: "Ticket sales",
      trendData: safeRealTimeMetrics.conversion.trend,
    },
    {
      key: "satisfaction",
      icon: "star",
      label: "Satisfaction",
      value: formatValue(safeRealTimeMetrics.satisfaction.current, "percentage"),
      change: safeRealTimeMetrics.satisfaction.change,
      color: "#f59e0b",
      subtitle: "Customer rating",
      trendData: safeRealTimeMetrics.satisfaction.trend,
    },
    {
      key: "avgTicket",
      icon: "ticket",
      label: "Avg Ticket Price",
      value: formatValue(safeRealTimeMetrics.avgTicket.current, "currency"),
      change: safeRealTimeMetrics.avgTicket.change,
      color: "#10b981",
      subtitle: "Per ticket sold",
      trendData: safeRealTimeMetrics.avgTicket.trend,
    },
    {
      key: "scanRate",
      icon: "qr-code",
      label: "Scan Rate",
      value: formatValue(safeRealTimeMetrics.scanRate.current, "percentage"),
      change: safeRealTimeMetrics.scanRate.change,
      color: "#3b82f6",
      subtitle: "Gate flow efficiency",
      trendData: safeRealTimeMetrics.scanRate.trend,
    },
    {
      key: "refundRate",
      icon: "refresh",
      label: "Refund Rate",
      value: formatValue(safeRealTimeMetrics.refundRate.current, "percentage"),
      change: safeRealTimeMetrics.refundRate.change,
      color: "#ef4444",
      subtitle: "Customer reversal rate",
      trendData: safeRealTimeMetrics.refundRate.trend,
    },
  ];
  const featuredKpiCard = kpiCarouselCards[0];
  const secondaryKpiCards = kpiCarouselCards.slice(1);
  const supportPostureValue = wsConnected
    ? "Live feed online"
    : safeSupportOpsSummary.activeQueues > 0
      ? "Snapshot available"
      : "Refresh recommended";
  const supportPostureHelper = wsConnected
    ? `${safeSupportOpsSummary.teamOnShift} agents on shift`
    : safeSupportOpsSummary.activeQueues > 0
      ? `${safeSupportOpsSummary.activeQueues} queues tracked • SLA ${safeSupportOpsSummary.slaHitRate.toFixed(1)}%`
      : wsError || "Using latest available dashboard snapshot";

  const dashboardHeroStats = [
    {
      key: "revenue",
      label: "Live revenue",
      value: formatValue(safeRealTimeMetrics.revenue.current, "revenue"),
      helper: `${selectedPeriod} commercial window`,
      icon: "cash-outline",
      accent: "#34d399",
    },
    {
      key: "events",
      label: "Active events",
      value: formatMetricValue(
        Math.max(
          asNumber(safeRealTimeMetrics.activeEvents.current),
          asNumber(safeOpsMetrics.totalEvents),
        ),
        "number",
      ),
      helper: `${formatMetricValue(safeOpsMetrics.pendingEvents, "number")} pending review`,
      icon: "calendar-outline",
      accent: "#60a5fa",
    },
    {
      key: "ops",
      label: "Support posture",
      value: supportPostureValue,
      helper: supportPostureHelper,
      icon: wsConnected ? "pulse-outline" : "alert-circle-outline",
      accent: wsConnected ? "#38bdf8" : "#f59e0b",
    },
  ];
  const headerRevenueSeriesSource =
    historicalData.hourly.revenue.length > 0
      ? historicalData.hourly.revenue.slice(-8)
      : safeRealTimeMetrics.revenue.trend.slice(-8);
  const generatedHeaderSeries = generateTrendData(
    Math.max(1, asNumber(safeRealTimeMetrics.revenue.current)),
    8,
  );
  const headerRevenueSeries = headerRevenueSeriesSource.length
    ? headerRevenueSeriesSource.map((value) => Math.max(0, asNumber(value)))
    : generatedHeaderSeries.map((value) => Math.max(0, asNumber(value)));
  const headerRevenueLabelsSource =
    historicalData.hourly.labels.length > 0
      ? historicalData.hourly.labels.slice(-headerRevenueSeries.length)
      : headerRevenueSeries.map((_, index) => `T${index + 1}`);
  const headerRevenueLabels =
    headerRevenueLabelsSource.length === headerRevenueSeries.length
      ? headerRevenueLabelsSource.map((label) =>
          `${label || ""}`.replace(":00", ""),
        )
      : headerRevenueSeries.map((_, index) => `T${index + 1}`);
  const headerRevenueMax = Math.max(...headerRevenueSeries, 1);
  const headerRevenueCurrent =
    headerRevenueSeries[headerRevenueSeries.length - 1] || 0;
  const headerRevenuePrevious =
    headerRevenueSeries[headerRevenueSeries.length - 2] || 0;
  const headerRevenueDelta =
    headerRevenueSeries.length > 1
      ? pctChange(headerRevenuePrevious, headerRevenueCurrent)
      : safeRealTimeMetrics.revenue.change;

  return (
    <ScreenContainer>
      <Modal
        visible={enterpriseModal.visible}
        transparent
        animationType="fade"
        onRequestClose={closeEnterpriseModal}
      >
        <View style={styles.enterpriseModalOverlay}>
          <View style={styles.enterpriseModalCard}>
            <View style={styles.enterpriseModalHeader}>
              <View style={styles.enterpriseModalHeaderText}>
                <Text style={styles.enterpriseModalTitle}>{enterpriseModal.title}</Text>
                <Text style={styles.enterpriseModalSubtitle}>
                  {enterpriseModal.subtitle}
                </Text>
              </View>
              <View style={styles.enterpriseModalTag}>
                <Text style={styles.enterpriseModalTagText}>{enterpriseModal.tag}</Text>
              </View>
            </View>
            <ScrollView
              style={styles.enterpriseModalBody}
              contentContainerStyle={styles.enterpriseModalBodyContent}
              showsVerticalScrollIndicator={false}
            >
              {(enterpriseModal.sections || []).map((section, idx) => (
                <View key={`section-${idx}`} style={styles.enterpriseSection}>
                  <Text style={styles.enterpriseSectionTitle}>{section.title}</Text>
                  {(section.lines || []).map((line, lineIdx) => (
                    <View
                      key={`line-${idx}-${lineIdx}`}
                      style={styles.enterpriseSectionLineRow}
                    >
                      <Ionicons
                        name="checkmark-circle-outline"
                        size={14}
                        color="#1d4ed8"
                      />
                      <Text style={styles.enterpriseSectionLineText}>{line}</Text>
                    </View>
                  ))}
                </View>
              ))}
            </ScrollView>
            <View style={styles.enterpriseModalActions}>
              <TouchableOpacity
                style={styles.enterpriseModalPrimary}
                onPress={closeEnterpriseModal}
                accessibilityRole="button"
                accessibilityLabel="Close enterprise details"
              >
                <Text style={styles.enterpriseModalPrimaryText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      <Animated.View
        style={[
          styles.container,
          { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
        ]}
      >
        <ScrollView
          style={styles.mainContent}
          contentContainerStyle={[
            styles.scrollContent,
            isMobileViewport && styles.scrollContentCompact,
          ]}
          showsVerticalScrollIndicator={false}
        >          {/* Dashboard Header */}
          <View style={styles.dashboardHeader}>
            <View style={styles.dashboardHeaderTopRow}>
              <View style={styles.dashboardHeaderTextWrap}>
                <Text style={styles.dashboardEyebrow}>Event Command Center</Text>
                <Text
                  style={[
                    styles.dashboardTitle,
                    isMobileViewport && styles.dashboardTitleCompact,
                  ]}
                >
                  Operations Dashboard
                </Text>
                <View style={styles.headerSubtitleRow}>
                  <View
                    style={[
                      styles.liveIndicator,
                      !wsConnected && styles.liveIndicatorWarn,
                    ]}
                  />
                  <Text style={styles.dashboardSubtitle}>
                    Enterprise oversight for revenue, event execution, support queues,
                    and control-room decisions.
                  </Text>
                </View>
                <View style={styles.headerActionRow}>
                  <TouchableOpacity
                    style={styles.headerPrimaryAction}
                    activeOpacity={0.9}
                    onPress={() =>
                      navigateSafe("Planner", {
                        dashboardIntent: "command-center-primary",
                      })
                    }
                    accessibilityRole="button"
                    accessibilityLabel="Open planning workspace"
                  >
                    <Ionicons name="grid-outline" size={16} color="#0f172a" />
                    <Text style={styles.headerPrimaryActionText}>
                      Open planner workspace
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.headerSecondaryAction}
                    activeOpacity={0.9}
                    onPress={() => navigateSafe("Events")}
                    accessibilityRole="button"
                    accessibilityLabel="Open events workspace"
                  >
                    <Ionicons name="calendar-outline" size={16} color="#334155" />
                    <Text style={styles.headerSecondaryActionText}>
                      Review event pipeline
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.headerSecondaryAction}
                    activeOpacity={0.9}
                    onPress={fetchDashboardData}
                    accessibilityRole="button"
                    accessibilityLabel="Refresh dashboard data"
                  >
                    <Ionicons name="refresh-outline" size={16} color="#334155" />
                    <Text style={styles.headerSecondaryActionText}>
                      Refresh live data
                    </Text>
                  </TouchableOpacity>
                </View>
                <View style={styles.headerStatusPills}>
                  <View style={styles.headerStatusPill}>
                    <Text style={styles.headerStatusLabel}>Live feed</Text>
                    <Text
                      style={[
                        styles.headerStatusValue,
                        wsConnected ? styles.headerStatusGood : styles.headerStatusWarn,
                      ]}
                    >
                      {wsConnected ? "Connected" : "Degraded"}
                    </Text>
                  </View>
                  <View style={styles.headerStatusPill}>
                    <Text style={styles.headerStatusLabel}>Freshness</Text>
                    <Text style={styles.headerStatusValue}>
                      {getFreshnessLabel(lastUpdate)}
                    </Text>
                  </View>
                  <View style={styles.headerStatusPill}>
                    <Text style={styles.headerStatusLabel}>Focus window</Text>
                    <Text style={styles.headerStatusValue}>{selectedPeriod}</Text>
                  </View>
                  <View style={styles.headerStatusPill}>
                    <Text style={styles.headerStatusLabel}>Data version</Text>
                    <Text style={styles.headerStatusValue}>v{dataVersion}</Text>
                  </View>
                </View>
                <View style={styles.headerGraphCard}>
                  <View style={styles.headerGraphHeader}>
                    <View>
                      <Text style={styles.headerGraphEyebrow}>
                        Live revenue curve
                      </Text>
                      <Text style={styles.headerGraphTitle}>
                        Commercial velocity
                      </Text>
                    </View>
                    <View style={styles.headerGraphMetricWrap}>
                      <Text style={styles.headerGraphMetricValue}>
                        {formatValue(headerRevenueCurrent, "revenue")}
                      </Text>
                      <Text
                        style={[
                          styles.headerGraphMetricDelta,
                          headerRevenueDelta >= 0
                            ? styles.headerGraphMetricDeltaPositive
                            : styles.headerGraphMetricDeltaNegative,
                        ]}
                      >
                        {headerRevenueDelta >= 0 ? "+" : ""}
                        {headerRevenueDelta.toFixed(1)}%
                      </Text>
                    </View>
                  </View>
                  <View style={styles.headerGraphPlot}>
                    {headerRevenueSeries.map((value, index) => {
                      const isLatest = index === headerRevenueSeries.length - 1;
                      return (
                        <View
                          key={`header-graph-${index}`}
                          style={styles.headerGraphColumn}
                        >
                          <View style={styles.headerGraphTrack}>
                            <View
                              style={[
                                styles.headerGraphBar,
                                {
                                  height: `${Math.max(
                                    12,
                                    Math.round((value / headerRevenueMax) * 100),
                                  )}%`,
                                  backgroundColor: isLatest ? "#7dd3fc" : "#38bdf8",
                                  opacity: isLatest ? 1 : 0.72,
                                },
                              ]}
                            />
                          </View>
                          <Text style={styles.headerGraphLabel} numberOfLines={1}>
                            {headerRevenueLabels[index]}
                          </Text>
                        </View>
                      );
                    })}
                  </View>
                  <View style={styles.headerGraphFooter}>
                    <Text style={styles.headerGraphFooterText}>
                      Peak demand around {peakHours}
                    </Text>
                    <Text style={styles.headerGraphFooterText}>
                      {wsConnected ? "Streaming updates" : "Manual refresh mode"}
                    </Text>
                  </View>
                </View>
              </View>
              <View style={styles.dashboardHeroStatGrid}>
                {dashboardHeroStats.map((item) => (
                  <View key={item.key} style={styles.dashboardHeroStatCard}>
                    <View
                      style={[
                        styles.dashboardHeroStatIconWrap,
                        { backgroundColor: `${item.accent}22` },
                      ]}
                    >
                      <Ionicons name={item.icon} size={18} color={item.accent} />
                    </View>
                    <Text style={styles.dashboardHeroStatLabel}>{item.label}</Text>
                    <Text style={styles.dashboardHeroStatValue}>{item.value}</Text>
                    <Text style={styles.dashboardHeroStatHelper}>{item.helper}</Text>
                  </View>
                ))}
              </View>
            </View>
          </View>
          {!wsConnected && (
            <View style={styles.connectionBanner}>
              <Ionicons name="alert-circle-outline" size={16} color="#b45309" />
              <Text style={styles.connectionBannerText}>
                Live feed degraded. Data may be delayed while reconnecting.
              </Text>
            </View>
          )}
          {!!wsError && <Text style={styles.socketWarning}>{wsError}</Text>}

          {/* Key Metrics Grid */}
          <View
            style={[
              styles.metricsSection,
              styles.sectionPanel,
              isMobileViewport && styles.sectionPanelCompact,
            ]}
          >
            <View style={styles.sectionHeader}>
              <View>
                <Text style={styles.sectionTitle}>Key Performance Indicators</Text>
                <Text style={styles.sectionSubtitle}>
                  Revenue, operations, and customer experience signals
                </Text>
              </View>
              <View style={styles.periodSelector}>
                {["1h", "3h", "6h", "24h", "7d"].map((period) => (
                  <TouchableOpacity
                    key={period}
                    style={[
                      styles.periodButton,
                      selectedPeriod === period && styles.periodButtonActive,
                    ]}
                    onPress={() => handlePeriodSelect(period)}
                    accessibilityRole="button"
                    accessibilityLabel={`Select ${period} period`}
                  >
                    <Text
                      style={[
                        styles.periodButtonText,
                        selectedPeriod === period &&
                          styles.periodButtonTextActive,
                      ]}
                    >
                      {period}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.featuredKpiShell}>
              <View style={styles.featuredKpiHeader}>
                <Text style={styles.featuredKpiEyebrow}>North-star KPI</Text>
                <Text style={styles.featuredKpiFreshness}>
                  {getFreshnessLabel(lastUpdate)}
                </Text>
              </View>
                <InteractiveMetricCard
                  icon={featuredKpiCard.icon}
                  label={featuredKpiCard.label}
                  value={featuredKpiCard.value}
                  change={featuredKpiCard.change}
                  color={featuredKpiCard.color}
                  isSelected={activeCardId === `kpi:${featuredKpiCard.key}`}
                  onClick={() => handleMetricClick(featuredKpiCard.key)}
                  trendData={featuredKpiCard.trendData}
                  subtitle="Primary business target"
                />
            </View>

            <View style={styles.kpiCarouselSection}>
              <View style={styles.kpiCarouselHeader}>
                <Text style={styles.kpiCarouselTitle}>
                  Supplementary KPI cards
                </Text>
                <View style={styles.kpiCarouselControlRow}>
                  <TouchableOpacity
                    style={styles.kpiArrow}
                    onPress={() => goToPrevKpiSlide(secondaryKpiCards.length)}
                    accessibilityRole="button"
                    accessibilityLabel="Show previous KPI card"
                  >
                    <Ionicons name="chevron-back" size={14} color="#1e293b" />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.kpiArrow}
                    onPress={() => goToNextKpiSlide(secondaryKpiCards.length)}
                    accessibilityRole="button"
                    accessibilityLabel="Show next KPI card"
                  >
                    <Ionicons name="chevron-forward" size={14} color="#1e293b" />
                  </TouchableOpacity>
                </View>
                <View style={styles.kpiCarouselIndicatorTopRight}>
                  {secondaryKpiCards.map((card, index) => (
                    <TouchableOpacity
                      key={card.key}
                      style={[
                        styles.kpiCarouselIndicatorDot,
                        kpiCarouselIndex === index &&
                          styles.kpiCarouselIndicatorDotActive,
                      ]}
                      onPress={() => goToKpiSlide(index, secondaryKpiCards.length)}
                      accessibilityRole="button"
                      accessibilityLabel={`Show ${card.label}`}
                    />
                  ))}
                </View>
              </View>
              <View
                style={styles.kpiCarouselWrapper}
                onLayout={handleKpiCarouselLayout}
                onMouseEnter={() =>
                  Platform.OS === "web" && setIsKpiCarouselHovered(true)
                }
                onMouseLeave={() =>
                  Platform.OS === "web" && setIsKpiCarouselHovered(false)
                }
              >
                {!!isKpiCarouselHovered && (
                  <Text style={styles.kpiPauseHint}>Autoplay paused</Text>
                )}
                <ScrollView
                  ref={kpiCarouselRef}
                  horizontal
                  snapToInterval={getKpiSlideStep()}
                  decelerationRate="fast"
                  showsHorizontalScrollIndicator={false}
                  scrollEventThrottle={16}
                  onScrollBeginDrag={() => {
                    kpiUserInteractingRef.current = true;
                  }}
                  onMomentumScrollEnd={(event) =>
                    handleKpiCarouselScrollEnd(event, secondaryKpiCards.length)
                  }
                  contentContainerStyle={styles.kpiCarouselTrack}
                >
                  {secondaryKpiCards.map((card, index) => (
                    <View
                      key={card.key}
                      style={[
                        styles.kpiCarouselSlide,
                        {
                          width: getKpiSlideWidth(),
                          marginRight:
                            index === secondaryKpiCards.length - 1
                              ? 0
                              : KPI_CARD_GAP,
                        },
                      ]}
                    >
                        <InteractiveMetricCard
                          icon={card.icon}
                          label={card.label}
                          value={card.value}
                          change={card.change}
                          color={card.color}
                          isSelected={activeCardId === `kpi:${card.key}`}
                          onClick={() => handleMetricClick(card.key)}
                          trendData={card.trendData}
                          subtitle={card.subtitle}
                        />
                    </View>
                  ))}
                </ScrollView>
              </View>
            </View>
          </View>

          {/* Operations Intelligence */}
          <View
            style={[
              styles.section,
              styles.sectionPanel,
              isMobileViewport && styles.sectionPanelCompact,
            ]}
          >
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Operations Intelligence</Text>
              <Text style={styles.sectionSubtitle}>
                Database-backed workload and execution health • {getFreshnessLabel(lastUpdate)}
              </Text>
            </View>
            <View style={styles.opsGrid}>
              <TouchableOpacity
                style={[
                  styles.opsCard,
                  activeCardId === "ops:totalEvents" && {
                    borderColor: "#2563eb",
                    backgroundColor: "#eff6ff",
                  },
                ]}
                activeOpacity={0.85}
                onPress={() => handleOpsCardPress("totalEvents")}
                onClick={() => handleOpsCardPress("totalEvents")}
                accessibilityRole="button"
                accessibilityLabel="Open total events operations metric"
              >
                <Text style={styles.opsLabel}>Total Events</Text>
                <Text style={styles.opsValue}>
                  {formatMetricValue(safeOpsMetrics.totalEvents, "number")}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.opsCard,
                  activeCardId === "ops:pendingReview" && {
                    borderColor: "#2563eb",
                    backgroundColor: "#eff6ff",
                  },
                ]}
                activeOpacity={0.85}
                onPress={() => handleOpsCardPress("pendingReview")}
                onClick={() => handleOpsCardPress("pendingReview")}
                accessibilityRole="button"
                accessibilityLabel="Open pending review operations metric"
              >
                <Text style={styles.opsLabel}>Pending Review</Text>
                <Text style={[styles.opsValue, { color: "#f59e0b" }]}>
                  {formatMetricValue(safeOpsMetrics.pendingEvents, "number")}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.opsCard,
                  activeCardId === "ops:archived" && {
                    borderColor: "#2563eb",
                    backgroundColor: "#eff6ff",
                  },
                ]}
                activeOpacity={0.85}
                onPress={() => handleOpsCardPress("archived")}
                onClick={() => handleOpsCardPress("archived")}
                accessibilityRole="button"
                accessibilityLabel="Open archived operations metric"
              >
                <Text style={styles.opsLabel}>Archived</Text>
                <Text style={[styles.opsValue, { color: "#64748b" }]}>
                  {formatMetricValue(safeOpsMetrics.archivedEvents, "number")}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.opsCard,
                  activeCardId === "ops:utilization" && {
                    borderColor: "#2563eb",
                    backgroundColor: "#eff6ff",
                  },
                ]}
                activeOpacity={0.85}
                onPress={() => handleOpsCardPress("utilization")}
                onClick={() => handleOpsCardPress("utilization")}
                accessibilityRole="button"
                accessibilityLabel="Open utilization operations metric"
              >
                <Text style={styles.opsLabel}>Capacity Utilization</Text>
                <Text style={[styles.opsValue, { color: "#2563eb" }]}>
                  {safeOpsMetrics.utilizationRate.toFixed(1)}%
                </Text>
              </TouchableOpacity>
            </View>
            <View style={styles.categoryStrip}>
                {safeOpsMetrics.topCategories.slice(0, 5).map((item, idx) => (
                  <TouchableOpacity
                    key={`${item.category}-${idx}`}
                    style={[
                      styles.categoryChip,
                      activeCardId === `category:${item.category}` && {
                        backgroundColor: "#dbeafe",
                        borderColor: "#93c5fd",
                      },
                    ]}
                    activeOpacity={0.85}
                    onPress={() => handleCategoryChipPress(item)}
                    onClick={() => handleCategoryChipPress(item)}
                  >
                  <Text style={styles.categoryChipText}>
                    {item.category}: {item.count}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.supportWorkspaceShell}>
              <View style={styles.supportWorkspaceHeader}>
                <View>
                  <Text style={styles.supportWorkspaceTitle}>
                    Support Operations Workspace
                  </Text>
                  <Text style={styles.supportWorkspaceSubtitle}>
                    Social media queue control, shift planning, breaks, and productivity governance
                  </Text>
                </View>
              </View>

              <View style={styles.supportMetricGrid}>
                <TouchableOpacity
                  style={[
                    styles.supportMetricCard,
                    activeCardId === "support:teamOnShift" && {
                      borderColor: "#1d4ed8",
                      backgroundColor: "#eff6ff",
                    },
                  ]}
                  activeOpacity={0.86}
                  onPress={() => handleSupportMetricPress("teamOnShift")}
                  onClick={() => handleSupportMetricPress("teamOnShift")}
                >
                  <Text style={styles.supportMetricLabel}>Team On Shift</Text>
                  <Text style={styles.supportMetricValue}>
                    {safeSupportOpsSummary.teamOnShift}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.supportMetricCard,
                    activeCardId === "support:activeQueues" && {
                      borderColor: "#1d4ed8",
                      backgroundColor: "#eff6ff",
                    },
                  ]}
                  activeOpacity={0.86}
                  onPress={() => handleSupportMetricPress("activeQueues")}
                  onClick={() => handleSupportMetricPress("activeQueues")}
                >
                  <Text style={styles.supportMetricLabel}>Active Queues</Text>
                  <Text style={styles.supportMetricValue}>
                    {safeSupportOpsSummary.activeQueues}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.supportMetricCard,
                    activeCardId === "support:slaHitRate" && {
                      borderColor: "#1d4ed8",
                      backgroundColor: "#eff6ff",
                    },
                  ]}
                  activeOpacity={0.86}
                  onPress={() => handleSupportMetricPress("slaHitRate")}
                  onClick={() => handleSupportMetricPress("slaHitRate")}
                >
                  <Text style={styles.supportMetricLabel}>SLA Hit Rate</Text>
                    <Text style={[styles.supportMetricValue, { color: "#16a34a" }]}>
                    {safeSupportOpsSummary.slaHitRate.toFixed(1)}%
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.supportMetricCard,
                    activeCardId === "support:avgResponseMin" && {
                      borderColor: "#1d4ed8",
                      backgroundColor: "#eff6ff",
                    },
                  ]}
                  activeOpacity={0.86}
                  onPress={() => handleSupportMetricPress("avgResponseMin")}
                  onClick={() => handleSupportMetricPress("avgResponseMin")}
                >
                    <Text style={styles.supportMetricLabel}>Avg First Response</Text>
                    <Text style={styles.supportMetricValue}>
                    {safeSupportOpsSummary.avgResponseMin.toFixed(1)}m
                  </Text>
                </TouchableOpacity>
              </View>

              <View style={styles.supportWorkspaceGrid}>
                <View style={styles.supportPanel}>
                  <Text style={styles.supportPanelTitle}>Shift Roster</Text>
                  {safeSupportShiftBoard.map((agent) => (
                    <TouchableOpacity
                      key={agent.name}
                      style={[
                        styles.supportRow,
                        activeCardId === `support:agent:${agent.name}` && {
                          borderColor: "#1d4ed8",
                          backgroundColor: "#eff6ff",
                        },
                      ]}
                      activeOpacity={0.88}
                      onPress={() => handleSupportAgentPress(agent)}
                      onClick={() => handleSupportAgentPress(agent)}
                    >
                      <View style={styles.supportRowMain}>
                        <Text style={styles.supportRowName}>{agent.name}</Text>
                        <Text style={styles.supportRowMeta}>
                          {agent.role} • {agent.shift}
                        </Text>
                        <Text style={styles.supportRowMeta}>
                          Queue: {agent.queue}
                        </Text>
                      </View>
                      <View style={styles.supportRowRight}>
                        <View
                          style={[
                            styles.supportStatusPill,
                            getAgentStatusStyle(agent.status),
                          ]}
                        >
                          <Text style={styles.supportStatusText}>{agent.status}</Text>
                        </View>
                        <Text style={styles.supportProductivityText}>
                          {agent.productivity}% prod.
                        </Text>
                        <Text style={styles.supportBreakText}>
                          Break: {agent.breakWindow}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>

                <View style={styles.supportPanel}>
                  <Text style={styles.supportPanelTitle}>Queue & Compliance Board</Text>
                  {safeSupportQueueBoard.map((queue) => (
                    <TouchableOpacity
                      key={queue.name}
                      style={[
                        styles.supportQueueRow,
                        activeCardId === `support:queue:${queue.name}` && {
                          borderColor: "#1d4ed8",
                          backgroundColor: "#eff6ff",
                        },
                      ]}
                      activeOpacity={0.88}
                      onPress={() => handleSupportQueuePress(queue)}
                      onClick={() => handleSupportQueuePress(queue)}
                    >
                      <View style={styles.supportQueueMain}>
                        <Text style={styles.supportQueueName}>{queue.name}</Text>
                        <Text style={styles.supportQueueMeta}>
                          Owner: {queue.owner}
                        </Text>
                      </View>
                      <View style={styles.supportQueueStats}>
                        <Text style={styles.supportQueueOpen}>{queue.open} open</Text>
                        <Text style={styles.supportQueueRisk}>
                          {queue.slaRisk} at-risk
                        </Text>
                      </View>
                    </TouchableOpacity>
                  ))}

                  <View style={styles.supportComplianceWrap}>
                    {safeSupportBreakCompliance.map((item) => (
                    <TouchableOpacity
                      key={item.metric}
                      style={[
                        styles.supportComplianceItem,
                        activeCardId === `support:compliance:${item.metric}` && {
                          borderColor: "#1d4ed8",
                          backgroundColor: "#eff6ff",
                        },
                      ]}
                      activeOpacity={0.88}
                      onPress={() => handleSupportCompliancePress(item)}
                      onClick={() => handleSupportCompliancePress(item)}
                    >
                        <Text style={styles.supportComplianceMetric}>{item.metric}</Text>
                        <Text
                          style={[
                            styles.supportComplianceValue,
                            item.tone === "good"
                              ? styles.supportComplianceGood
                              : styles.supportComplianceWarn,
                          ]}
                        >
                          {item.value}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              </View>

            </View>
          </View>

            <View style={styles.quickActionsRow}>
              <TouchableOpacity
                style={[
                  styles.quickActionCard,
                  activeCardId === "quick:planner" && {
                    borderColor: "#1d4ed8",
                    backgroundColor: "#eff6ff",
                  },
                ]}
                onPress={() => handleQuickActionPress("planner")}
                onClick={() => handleQuickActionPress("planner")}
                activeOpacity={0.85}
                accessibilityRole="button"
                accessibilityLabel="Open planner workspace"
            >
              <View style={styles.quickActionIconWrap}>
                <Ionicons name="people-outline" size={16} color="#1d4ed8" />
              </View>
              <View>
                <Text style={styles.quickActionTitle}>Planner Workspace</Text>
                <Text style={styles.quickActionSub}>
                  Manage support shifts, breaks, and social queue productivity
                </Text>
              </View>
            </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.quickActionCard,
                  activeCardId === "quick:sync" && {
                    borderColor: "#1d4ed8",
                    backgroundColor: "#eff6ff",
                  },
                ]}
                onPress={() => handleQuickActionPress("sync")}
                onClick={() => handleQuickActionPress("sync")}
                activeOpacity={0.85}
                accessibilityRole="button"
                accessibilityLabel="Sync dashboard metrics now"
              >
              <View style={styles.quickActionIconWrap}>
                <Ionicons name="refresh-outline" size={16} color="#1d4ed8" />
              </View>
              <View>
                <Text style={styles.quickActionTitle}>Sync Now</Text>
                <Text style={styles.quickActionSub}>
                  Pull latest DB metrics
                </Text>
              </View>
            </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.quickActionCard,
                  activeCardId === "quick:streams" && {
                    borderColor: "#1d4ed8",
                    backgroundColor: "#eff6ff",
                  },
                ]}
                onPress={() => handleQuickActionPress("streams")}
                onClick={() => handleQuickActionPress("streams")}
                activeOpacity={0.85}
                accessibilityRole="button"
                accessibilityLabel="Open data stream diagnostics"
            >
              <View style={styles.quickActionIconWrap}>
                <Ionicons
                  name="git-network-outline"
                  size={16}
                  color="#1d4ed8"
                />
              </View>
              <View>
                <Text style={styles.quickActionTitle}>Data Streams</Text>
                <Text style={styles.quickActionSub}>
                  v{dataVersion} • {wsConnected ? "Connected" : "Degraded"}
                </Text>
              </View>
            </TouchableOpacity>
          </View>

          {/* Management Hub */}
          <View
            style={[
              styles.section,
              styles.sectionPanel,
              isMobileViewport && styles.sectionPanelCompact,
            ]}
          >
            <View style={styles.sectionHeader}>
              <View>
                <Text style={styles.sectionTitle}>Management Hub</Text>
                <Text style={styles.sectionSubtitle}>
                  Workspaces and tools for event operations
                </Text>
              </View>
              <View style={styles.hubMetaRight}>
                <View style={styles.hubMetaPill}>
                  <Ionicons name="shield-checkmark" size={14} color="#2563eb" />
                  <Text style={styles.hubMetaText}>Enterprise Controls</Text>
                </View>
              </View>
            </View>

            <View style={styles.hubSearchRow}>
              <View style={styles.hubSearchBox}>
                <Ionicons name="search" size={16} color="#64748b" />
                <TextInput
                  value={hubQuery}
                  onChangeText={setHubQuery}
                  placeholder="Search modules or actions (e.g., refunds, scanner, promo codes)"
                  placeholderTextColor="#94a3b8"
                  style={styles.hubSearchInput}
                />
                {!!hubQuery && (
                  <TouchableOpacity
                    onPress={() => setHubQuery("")}
                    style={styles.hubClear}
                  >
                    <Ionicons name="close-circle" size={18} color="#94a3b8" />
                  </TouchableOpacity>
                )}
              </View>
            </View>

            <View style={styles.hubGrid}>
              {managementModules
                .filter((m) => {
                  if (!hubQuery.trim()) return true;
                  const q = hubQuery.trim().toLowerCase();
                  const inModule = `${m.title} ${m.subtitle}`
                    .toLowerCase()
                    .includes(q);
                  const inActions = m.groups.some((g) =>
                    g.actions.some((a) =>
                      `${a.label} ${a.description}`.toLowerCase().includes(q),
                    ),
                  );
                  return inModule || inActions;
                })
                .map((item) => (
                  <ManagementHubCard
                    key={item.id}
                    item={item}
                    expanded={expandedModuleId === item.id}
                    shellStyle={
                      isHubWide ? styles.mhCardShellWide : styles.mhCardShellNarrow
                    }
                    onToggle={() =>
                      setExpandedModuleId((prev) =>
                        prev === item.id ? null : item.id,
                      )
                    }
                    onNavigate={onHubNavigate}
                  />
                ))}
            </View>
          </View>

          {/* Revenue Projections */}
          <View
            style={[
              styles.section,
              styles.sectionPanel,
              isMobileViewport && styles.sectionPanelCompact,
            ]}
          >
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Revenue Forecast</Text>
              <Text style={styles.sectionSubtitle}>
                AI-assisted projections from live demand signals
              </Text>
            </View>

            <View style={styles.forecastShell}>
              <View style={styles.forecastHeaderRow}>
                <Text style={styles.forecastHeaderText}>Scenario Ladder</Text>
                <Text style={styles.forecastHeaderMeta}>
                  Baseline:{" "}
                      {formatValue(safeRealTimeMetrics.revenue.current, "currency")}
                </Text>
              </View>
              <View style={styles.projectionGrid}>
                {["1h", "3h", "6h", "24h", "7d"].map((period) => (
                  <TimePeriodProjection
                    key={period}
                    period={period}
                    data={{
                      currentRevenue: safeRealTimeMetrics.revenue.current,
                      projectedRevenue:
                        safeRevenueForecast[period]?.projectedRevenue,
                      projectedGrowth:
                        safeRevenueForecast[period]?.projectedGrowth,
                      currentAttendees: safeRealTimeMetrics.attendees.current,
                    }}
                    onSelect={handlePeriodSelect}
                  />
                ))}
              </View>
            </View>
          </View>

          {/* Top Performing Events */}
          <View
            style={[
              styles.section,
              styles.sectionPanel,
              isMobileViewport && styles.sectionPanelCompact,
            ]}
          >
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Top Performing Events</Text>
                <TouchableOpacity
                  style={styles.viewAllButton}
                  onPress={() => navigateSafe("Events")}
                  accessibilityRole="button"
                  accessibilityLabel="Open full event list"
                >
                <Text style={styles.viewAllText}>View All</Text>
                <Ionicons name="chevron-forward" size={16} color="#6366f1" />
              </TouchableOpacity>
            </View>

            {topEvents.length > 0 ? (
              <View style={styles.eventsGrid}>
                {topEvents.map((event, index) => (
                    <TouchableOpacity
                      key={event.id || index}
                      style={[
                        styles.eventCard,
                        activeCardId === `top-event:${event.id || index}` && {
                          borderColor: "#1d4ed8",
                          backgroundColor: "#eff6ff",
                        },
                      ]}
                    onPress={() => handleTopEventPress(event, index)}
                    onClick={() => handleTopEventPress(event, index)}
                    activeOpacity={0.8}
                    accessibilityRole="button"
                    accessibilityLabel={`Open ${event.name || `event ${index + 1}`} details`}
                  >
                    <View style={styles.eventHeader}>
                      <View
                        style={[
                          styles.eventStatus,
                          {
                            backgroundColor:
                              event.status === "active"
                                ? "#10b98120"
                                : "#f59e0b20",
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.eventStatusText,
                            {
                              color:
                                event.status === "active"
                                  ? "#10b981"
                                  : "#f59e0b",
                            },
                          ]}
                        >
                          {event.status === "active" ? "Live" : "Upcoming"}
                        </Text>
                      </View>
                      <Text style={styles.eventRank}>#{index + 1}</Text>
                    </View>

                    <Text style={styles.eventName} numberOfLines={2}>
                      {event.name || `Event ${index + 1}`}
                    </Text>

                    <View style={styles.eventMetrics}>
                      <View style={styles.eventMetric}>
                        <Ionicons name="cash" size={14} color="#6366f1" />
                        <Text style={styles.eventMetricValue}>
                          {formatZarCurrency(event.revenue || 0)}
                        </Text>
                      </View>
                      <View style={styles.eventMetric}>
                        <Ionicons name="people" size={14} color="#8b5cf6" />
                        <Text style={styles.eventMetricValue}>
                          {formatMetricValue(
                            event.attendees || event.ticketsSold || 0,
                            "number",
                          )}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.eventProgress}>
                      <View style={styles.eventProgressBar}>
                        <View
                          style={[
                            styles.eventProgressFill,
                            {
                              width: `${Math.min(100, event.attendanceRate || 75)}%`,
                            },
                          ]}
                        />
                      </View>
                      <Text style={styles.eventProgressText}>
                        {event.attendanceRate || 75}% attendance
                      </Text>
                    </View>
                    <View style={styles.eventCardActionRow}>
                      <Text style={styles.eventCardActionText}>View details</Text>
                      <Ionicons
                        name="arrow-forward-circle-outline"
                        size={16}
                        color="#64748b"
                      />
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            ) : (
              <View style={styles.noEvents}>
                <Ionicons name="calendar-outline" size={48} color="#94a3b8" />
                <Text style={styles.noEventsText}>
                  No events data available
                </Text>
                <Text style={styles.noEventsSubtext}>
                  Events will appear here when created
                </Text>
                <View style={styles.noEventsActions}>
                  <TouchableOpacity
                    style={styles.noEventsPrimary}
                    onPress={() => navigateSafe("CreateEvent")}
                    accessibilityRole="button"
                    accessibilityLabel="Open event planner"
                  >
                    <Text style={styles.noEventsPrimaryText}>Create event</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.noEventsSecondary}
                    onPress={fetchDashboardData}
                    accessibilityRole="button"
                    accessibilityLabel="Retry loading events"
                  >
                    <Text style={styles.noEventsSecondaryText}>Retry</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>

          {/* Data Source Footer */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>
              Enterprise telemetry • WebSocket + Database pipeline
            </Text>
          </View>
        </ScrollView>
      </Animated.View>
    </ScreenContainer>
  );
};

// Modern, professional styles
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#eef3fb",
  },
  mainContent: {
    flex: 1,
  },
  scrollContent: {
    padding: 28,
    paddingBottom: 56,
  },
  scrollContentCompact: {
    padding: 16,
    paddingBottom: 44,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f8fafc",
  },
  loadingText: {
    fontSize: 18,
    color: "#1e293b",
    fontWeight: "600",
    marginTop: 20,
    marginBottom: 8,
  },
  loadingSubtext: {
    fontSize: 14,
    color: "#64748b",
    textAlign: "center",
  },
  loadingSkeletonRow: {
    marginTop: 18,
    flexDirection: "row",
    gap: 10,
  },
  loadingSkeletonCard: {
    width: 110,
    height: 70,
    borderRadius: 10,
    backgroundColor: "#e2e8f0",
    borderWidth: 1,
    borderColor: "#dbe4f3",
  },
  loadingRetry: {
    marginTop: 16,
    minHeight: 44,
    borderRadius: 10,
    backgroundColor: "#1d4ed8",
    paddingHorizontal: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingRetryText: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "800",
  },
  dashboardHeader: {
    marginBottom: 32,
    padding: 24,
    borderRadius: 16,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#dbe4f3",
    shadowColor: "#94a3b8",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.16,
    shadowRadius: 20,
    elevation: 3,
  },
  dashboardHeaderTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "stretch",
    gap: 12,
    flexWrap: "wrap",
  },
  dashboardHeaderTextWrap: {
    flex: 1,
    minWidth: 260,
  },
  dashboardEyebrow: {
    color: "#0f172a",
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 1.1,
    marginBottom: 8,
    fontWeight: "700",
  },
  dashboardTitle: {
    fontSize: 30,
    fontWeight: "800",
    color: "#0f172a",
    letterSpacing: -0.6,
    marginBottom: 10,
  },
  dashboardTitleCompact: {
    fontSize: 24,
    lineHeight: 30,
  },
  headerSubtitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 2,
  },
  liveIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#22c55e",
  },
  liveIndicatorWarn: {
    backgroundColor: "#f59e0b",
  },
  dashboardSubtitle: {
    fontSize: 15,
    color: "#475569",
    fontWeight: "600",
    flex: 1,
    minWidth: 0,
  },
  headerActionRow: {
    marginTop: 20,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  socketWarning: {
    marginTop: 4,
    color: "#f59e0b",
    fontSize: 12,
    fontWeight: "600",
    marginBottom: 12,
  },
  headerPrimaryAction: {
    minHeight: 44,
    borderRadius: 10,
    backgroundColor: "#e0f2fe",
    borderWidth: 1,
    borderColor: "#bae6fd",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  headerPrimaryActionText: {
    color: "#0f172a",
    fontSize: 12,
    fontWeight: "800",
  },
  headerSecondaryAction: {
    minHeight: 44,
    borderRadius: 10,
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#dbe4f3",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  headerSecondaryActionText: {
    color: "#0f172a",
    fontSize: 12,
    fontWeight: "700",
  },
  headerStatusPills: {
    marginTop: 14,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  headerStatusPill: {
    minHeight: 44,
    borderWidth: 1,
    borderColor: "#dbe4f3",
    backgroundColor: "#f8fbff",
    borderRadius: 10,
    paddingHorizontal: 12,
    justifyContent: "center",
  },
  headerStatusLabel: {
    fontSize: 10,
    color: "#64748b",
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  headerStatusValue: {
    marginTop: 2,
    fontSize: 12,
    color: "#0f172a",
    fontWeight: "800",
  },
  headerStatusGood: {
    color: "#22c55e",
  },
  headerStatusWarn: {
    color: "#f59e0b",
  },
  headerGraphCard: {
    marginTop: 18,
    flexGrow: 1,
    minHeight: 228,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#dbe4f3",
    backgroundColor: "#f8fbff",
    padding: 16,
  },
  headerGraphHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
    flexWrap: "wrap",
  },
  headerGraphEyebrow: {
    fontSize: 11,
    fontWeight: "800",
    color: "#0f172a",
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  headerGraphTitle: {
    marginTop: 6,
    fontSize: 18,
    fontWeight: "800",
    color: "#0f172a",
    letterSpacing: -0.3,
  },
  headerGraphMetricWrap: {
    alignItems: "flex-end",
  },
  headerGraphMetricValue: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0f172a",
  },
  headerGraphMetricDelta: {
    marginTop: 4,
    fontSize: 12,
    fontWeight: "800",
  },
  headerGraphMetricDeltaPositive: {
    color: "#34d399",
  },
  headerGraphMetricDeltaNegative: {
    color: "#fca5a5",
  },
  headerGraphPlot: {
    marginTop: 18,
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 10,
    minHeight: 132,
    flexGrow: 1,
  },
  headerGraphColumn: {
    flex: 1,
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 8,
  },
  headerGraphTrack: {
    width: "100%",
    height: 132,
    borderRadius: 16,
    backgroundColor: "#eef6ff",
    borderWidth: 1,
    borderColor: "#d7e7fa",
    padding: 8,
    justifyContent: "flex-end",
  },
  headerGraphBar: {
    width: "100%",
    borderRadius: 10,
    minHeight: 10,
  },
  headerGraphLabel: {
    fontSize: 10,
    color: "#475569",
    fontWeight: "700",
    maxWidth: "100%",
  },
  headerGraphFooter: {
    marginTop: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
    flexWrap: "wrap",
  },
  headerGraphFooterText: {
    fontSize: 11,
    color: "#475569",
    fontWeight: "700",
  },
  dashboardHeroStatGrid: {
    flexGrow: 1,
    flexBasis: 320,
    maxWidth: 360,
    minWidth: 280,
    gap: 12,
  },
  dashboardHeroStatCard: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#dbe4f3",
    backgroundColor: "#f8fbff",
    paddingHorizontal: 16,
    paddingVertical: 15,
  },
  dashboardHeroStatIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  dashboardHeroStatLabel: {
    fontSize: 11,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.6,
    color: "#64748b",
  },
  dashboardHeroStatValue: {
    marginTop: 8,
    fontSize: 22,
    lineHeight: 28,
    fontWeight: "800",
    color: "#0f172a",
    letterSpacing: -0.4,
  },
  dashboardHeroStatHelper: {
    marginTop: 6,
    fontSize: 12,
    lineHeight: 18,
    color: "#475569",
    fontWeight: "600",
  },
  connectionBanner: {
    marginTop: -18,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#fcd34d",
    backgroundColor: "#fffbeb",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  connectionBannerText: {
    flex: 1,
    fontSize: 12,
    color: "#92400e",
    fontWeight: "700",
  },
  stickyNavWrap: {
    position: "sticky",
    top: 8,
    zIndex: 20,
    marginBottom: 18,
  },
  quickActionsRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 28,
    flexWrap: "wrap",
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#dbe4f3",
    borderRadius: 24,
    padding: 16,
    shadowColor: "#0f172a",
    shadowOffset: { width: 0, height: 18 },
    shadowOpacity: 0.08,
    shadowRadius: 30,
    elevation: 2,
  },
  quickActionCard: {
    flex: 1,
    minWidth: 230,
    backgroundColor: "#f8fbff",
    borderWidth: 1,
    borderColor: "#d9e6fb",
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  quickActionIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: "#dbeafe",
    justifyContent: "center",
    alignItems: "center",
  },
  quickActionTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#0f172a",
  },
  quickActionSub: {
    fontSize: 12,
    color: "#64748b",
    marginTop: 2,
  },

  // === Management Hub ===
  hubMetaRight: {
    flexDirection: "row",
    alignItems: "center",
  },
  hubMetaPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: "#eff6ff",
    borderWidth: 1,
    borderColor: "#dbeafe",
  },
  hubMetaText: {
    fontSize: 12,
    color: "#1d4ed8",
    fontWeight: "700",
  },
  hubSearchRow: {
    marginTop: 14,
    marginBottom: 14,
  },
  hubSearchBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#dbeafe",
    backgroundColor: "#ffffff",
  },
  hubSearchInput: {
    flex: 1,
    fontSize: 13,
    color: "#0f172a",
    fontWeight: "600",
    paddingVertical: 0,
  },
  hubClear: {
    paddingLeft: 4,
    paddingVertical: 2,
  },
  hubGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 14,
  },

  mhCardShell: {
    flexGrow: 1,
    minWidth: 0,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#dbeafe",
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: "#0b1220",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 18,
    elevation: 1,
  },
  mhCardShellWide: {
    flexBasis: 520,
    minWidth: 420,
  },
  mhCardShellNarrow: {
    flexBasis: "100%",
    minWidth: 0,
  },
  mhCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  mhCardHeaderHover: {
    backgroundColor: "#f8fafc",
  },
  mhIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  mhHeaderText: {
    flex: 1,
  },
  mhTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#0f172a",
    letterSpacing: -0.2,
  },
  mhSubtitle: {
    fontSize: 12,
    color: "#64748b",
    marginTop: 2,
    fontWeight: "600",
  },
  mhHeaderRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  mhPill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  mhPillText: {
    fontSize: 11,
    fontWeight: "800",
  },
  mhCardBody: {
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0",
  },
  mhBodyInner: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 14,
  },
  mhGroup: {
    gap: 10,
  },
  mhGroupTitle: {
    fontSize: 11,
    color: "#334155",
    fontWeight: "900",
    letterSpacing: 0.6,
    textTransform: "uppercase",
  },
  mhActionsGrid: {
    gap: 10,
  },
  mhAction: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    backgroundColor: "#fbfdff",
  },
  mhActionIcon: {
    width: 30,
    height: 30,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  mhActionText: {
    flex: 1,
  },
  mhActionTitle: {
    fontSize: 13,
    color: "#0f172a",
    fontWeight: "800",
  },
  mhActionSub: {
    fontSize: 12,
    color: "#64748b",
    marginTop: 2,
    fontWeight: "600",
  },
  viewControls: {
    flexDirection: "row",
    gap: 12,
    flexWrap: "wrap",
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#dbe4f3",
    borderRadius: 12,
    padding: 8,
  },
  viewControlButton: {
    minHeight: 44,
    paddingHorizontal: 18,
    paddingVertical: 10,
    backgroundColor: "#f8fafc",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    justifyContent: "center",
  },
  viewControlButtonActive: {
    backgroundColor: "#1d4ed8",
    borderColor: "#1d4ed8",
  },
  viewControlText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#334155",
  },
  viewControlTextActive: {
    color: "#fff",
  },
  metricsSection: {
    marginBottom: 32,
  },
  section: {
    marginBottom: 32,
  },
  sectionPanel: {
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#dbe4f3",
    borderRadius: 24,
    padding: 24,
    shadowColor: "#0f172a",
    shadowOffset: { width: 0, height: 18 },
    shadowOpacity: 0.08,
    shadowRadius: 30,
    elevation: 2,
  },
  sectionPanelCompact: {
    padding: 16,
    borderRadius: 18,
  },
  opsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 12,
  },
  opsCard: {
    flexGrow: 1,
    minWidth: 180,
    backgroundColor: "#ffffff",
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  opsLabel: {
    color: "#64748b",
    fontSize: 12,
    fontWeight: "600",
    marginBottom: 6,
  },
  opsValue: {
    color: "#0f172a",
    fontSize: 22,
    fontWeight: "800",
  },
  categoryStrip: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  categoryChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "#eef2ff",
    borderWidth: 1,
    borderColor: "#c7d2fe",
    cursor: "pointer",
  },
  categoryChipText: {
    color: "#3730a3",
    fontSize: 12,
    fontWeight: "700",
  },
  supportWorkspaceShell: {
    marginTop: 16,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#dbe4f3",
    borderRadius: 14,
    padding: 16,
    gap: 14,
  },
  supportWorkspaceHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
    flexWrap: "wrap",
  },
  supportWorkspaceTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0f172a",
  },
  supportWorkspaceSubtitle: {
    marginTop: 4,
    fontSize: 12,
    color: "#64748b",
    fontWeight: "600",
  },
  supportWorkspaceMode: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#cbd5e1",
    backgroundColor: "#f8fafc",
  },
  supportWorkspaceModeActive: {
    borderColor: "#bfdbfe",
    backgroundColor: "#eff6ff",
  },
  supportWorkspaceModeText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#475569",
  },
  supportWorkspaceModeTextActive: {
    color: "#1d4ed8",
  },
  supportMetricGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  supportMetricCard: {
    flexGrow: 1,
    minWidth: 170,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: "#f8fafc",
    cursor: "pointer",
  },
  supportMetricLabel: {
    fontSize: 11,
    color: "#64748b",
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  supportMetricValue: {
    fontSize: 20,
    color: "#0f172a",
    fontWeight: "800",
    letterSpacing: -0.2,
  },
  supportWorkspaceGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  supportPanel: {
    flexGrow: 1,
    minWidth: 330,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 12,
    padding: 12,
    backgroundColor: "#ffffff",
    gap: 10,
  },
  supportPanelTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: "#1e293b",
    marginBottom: 2,
  },
  supportRow: {
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 10,
    padding: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 10,
    backgroundColor: "#fbfdff",
    cursor: "pointer",
  },
  supportRowMain: {
    flex: 1,
    minWidth: 0,
    gap: 3,
  },
  supportRowName: {
    fontSize: 13,
    fontWeight: "800",
    color: "#0f172a",
  },
  supportRowMeta: {
    fontSize: 11,
    color: "#64748b",
    fontWeight: "600",
  },
  supportRowRight: {
    alignItems: "flex-end",
    justifyContent: "center",
    gap: 4,
    minWidth: 95,
  },
  supportStatusPill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
  },
  supportStatusOnline: {
    backgroundColor: "#dcfce7",
  },
  supportStatusBreak: {
    backgroundColor: "#fef9c3",
  },
  supportStatusTraining: {
    backgroundColor: "#e0e7ff",
  },
  supportStatusOffline: {
    backgroundColor: "#e2e8f0",
  },
  supportStatusText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#1e293b",
  },
  supportProductivityText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#0f172a",
  },
  supportBreakText: {
    fontSize: 10,
    color: "#64748b",
    fontWeight: "600",
  },
  supportQueueRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 9,
    backgroundColor: "#fbfdff",
    cursor: "pointer",
  },
  supportQueueMain: {
    flex: 1,
    minWidth: 0,
  },
  supportQueueName: {
    fontSize: 12,
    fontWeight: "800",
    color: "#0f172a",
  },
  supportQueueMeta: {
    marginTop: 2,
    fontSize: 11,
    color: "#64748b",
    fontWeight: "600",
  },
  supportQueueStats: {
    alignItems: "flex-end",
    gap: 2,
  },
  supportQueueOpen: {
    fontSize: 12,
    fontWeight: "800",
    color: "#0f172a",
  },
  supportQueueRisk: {
    fontSize: 11,
    fontWeight: "700",
    color: "#dc2626",
  },
  supportComplianceWrap: {
    marginTop: 4,
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0",
    paddingTop: 10,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  supportComplianceItem: {
    flexGrow: 1,
    minWidth: 120,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: "#f8fafc",
    cursor: "pointer",
  },
  supportComplianceMetric: {
    fontSize: 11,
    color: "#64748b",
    fontWeight: "700",
    marginBottom: 5,
  },
  supportComplianceValue: {
    fontSize: 14,
    fontWeight: "800",
  },
  supportComplianceGood: {
    color: "#15803d",
  },
  supportComplianceWarn: {
    color: "#b45309",
  },
  enterpriseModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.55)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  enterpriseModalCard: {
    width: "100%",
    maxWidth: 760,
    maxHeight: "86%",
    backgroundColor: "#ffffff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#dbe4f3",
    overflow: "hidden",
  },
  enterpriseModalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
    paddingHorizontal: 18,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
    backgroundColor: "#f8fbff",
  },
  enterpriseModalHeaderText: {
    flex: 1,
  },
  enterpriseModalTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0f172a",
  },
  enterpriseModalSubtitle: {
    marginTop: 5,
    fontSize: 12,
    color: "#475569",
    fontWeight: "600",
    lineHeight: 18,
  },
  enterpriseModalTag: {
    borderWidth: 1,
    borderColor: "#bfdbfe",
    backgroundColor: "#eff6ff",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  enterpriseModalTagText: {
    fontSize: 11,
    color: "#1d4ed8",
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  enterpriseModalBody: {
    maxHeight: 420,
  },
  enterpriseModalBodyContent: {
    paddingHorizontal: 18,
    paddingVertical: 14,
    gap: 10,
  },
  enterpriseSection: {
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 12,
    padding: 12,
    backgroundColor: "#ffffff",
    gap: 8,
  },
  enterpriseSectionTitle: {
    fontSize: 12,
    fontWeight: "800",
    color: "#1e293b",
  },
  enterpriseSectionLineRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
  },
  enterpriseSectionLineText: {
    flex: 1,
    fontSize: 12,
    color: "#334155",
    fontWeight: "600",
    lineHeight: 18,
  },
  enterpriseModalActions: {
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0",
    paddingHorizontal: 18,
    paddingVertical: 12,
    flexDirection: "row",
    justifyContent: "flex-end",
  },
  enterpriseModalPrimary: {
    backgroundColor: "#1d4ed8",
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  enterpriseModalPrimaryText: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "800",
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24,
    gap: 10,
    flexWrap: "wrap",
  },
  sectionTitle: {
    fontSize: 21,
    fontWeight: "700",
    color: "#0f172a",
  },
  sectionSubtitle: {
    fontSize: 14,
    color: "#475569",
    fontWeight: "500",
  },
  periodSelector: {
    flexDirection: "row",
    gap: 8,
    backgroundColor: "#f1f5f9",
    padding: 4,
    borderRadius: 8,
  },
  periodButton: {
    minHeight: 44,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    justifyContent: "center",
  },
  periodButtonActive: {
    backgroundColor: "#fff",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  periodButtonText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#64748b",
  },
  periodButtonTextActive: {
    color: "#6366f1",
  },
  metricsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 20,
  },
  kpiCarouselSection: {
    marginTop: 20,
  },
  kpiCarouselHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
    flexWrap: "wrap",
    gap: 10,
  },
  kpiCarouselTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#334155",
  },
  kpiCarouselWrapper: {
    position: "relative",
  },
  kpiCarouselTrack: {
    alignItems: "stretch",
  },
  kpiCarouselSlide: {
    paddingRight: 0,
  },
  kpiCarouselIndicatorTopRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  kpiCarouselControlRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  kpiArrow: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: "#cbd5e1",
    backgroundColor: "#ffffff",
    justifyContent: "center",
    alignItems: "center",
  },
  kpiPauseHint: {
    position: "absolute",
    top: 8,
    right: 10,
    fontSize: 11,
    color: "#475569",
    fontWeight: "700",
    zIndex: 2,
    backgroundColor: "#f8fafc",
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  featuredKpiShell: {
    marginTop: 10,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: "#bfdbfe",
    backgroundColor: "#eff6ff",
    borderRadius: 16,
    padding: 12,
  },
  featuredKpiHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  featuredKpiEyebrow: {
    fontSize: 11,
    fontWeight: "800",
    color: "#1d4ed8",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  featuredKpiFreshness: {
    fontSize: 11,
    color: "#334155",
    fontWeight: "700",
  },
  kpiCarouselIndicatorDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#cbd5e1",
  },
  kpiCarouselIndicatorDotActive: {
    width: 20,
    borderRadius: 6,
    backgroundColor: "#2563eb",
  },
  interactiveMetricCard: {
    flex: 1,
    minWidth: 0,
    backgroundColor: "#ffffff",
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: "#dbe4f3",
    shadowColor: "#0f172a",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.05,
    shadowRadius: 14,
    elevation: 2,
    position: "relative",
    overflow: "hidden",
  },
  interactiveMetricCardHover: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 2,
    borderColor: "#6366f120",
    transform: [{ translateY: -2 }],
  },
  metricHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  metricIconContainer: {
    width: 38,
    height: 38,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  metricChangeIndicator: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: "#f8fafc",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  metricChangeText: {
    fontSize: 12,
    fontWeight: "600",
  },
  metricValue: {
    fontSize: 22,
    fontWeight: "800",
    color: "#1e293b",
    marginBottom: 6,
    letterSpacing: -0.5,
  },
  metricLabel: {
    fontSize: 13,
    color: "#1e293b",
    fontWeight: "600",
    marginBottom: 4,
  },
  metricSubtitle: {
    fontSize: 11,
    color: "#64748b",
    marginBottom: 8,
  },
  trendContainer: {
    height: 28,
    marginTop: 8,
  },
  metricHoverOverlay: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: "rgba(99, 102, 241, 0.02)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#6366f120",
    borderRadius: 16,
  },
  metricLoading: {
    marginVertical: 20,
  },
  projectionGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 16,
  },
  forecastShell: {
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#dbe4f3",
    borderRadius: 14,
    padding: 16,
  },
  forecastHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  forecastHeaderText: {
    fontSize: 13,
    color: "#0f172a",
    fontWeight: "700",
  },
  forecastHeaderMeta: {
    fontSize: 12,
    color: "#475569",
    fontWeight: "600",
  },
  projectionCard: {
    flex: 1,
    minWidth: 200,
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    shadowColor: "#0f172a",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  projectionContent: {
    flex: 1,
  },
  projectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 16,
  },
  projectionBadge: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  projectionLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#334155",
    flex: 1,
  },
  projectionValue: {
    fontSize: 22,
    fontWeight: "800",
    color: "#0f172a",
    marginBottom: 8,
  },
  projectionMetricLabel: {
    fontSize: 11,
    color: "#94a3b8",
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 12,
  },
  projectionMeta: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  projectionChange: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  projectionChangeText: {
    fontSize: 12,
    fontWeight: "600",
  },
  projectionTime: {
    fontSize: 11,
    color: "#64748b",
    fontWeight: "500",
  },
  analyticsRow: {
    flexDirection: "row",
    gap: 24,
    marginBottom: 32,
  },
  chartContainer: {
    flex: 2,
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    borderColor: "#dbe4f3",
    shadowColor: "#0f172a",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.05,
    shadowRadius: 14,
    elevation: 2,
  },
  performanceContainer: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    borderColor: "#dbe4f3",
    shadowColor: "#0f172a",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.05,
    shadowRadius: 14,
    elevation: 2,
  },
  chartHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24,
  },
  chartTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1e293b",
  },
  chartFilters: {
    flexDirection: "row",
    gap: 8,
  },
  chartFilter: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: "#f8fafc",
  },
  chartFilterActive: {
    backgroundColor: "#6366f1",
  },
  chartFilterText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#64748b",
  },
  chartFilterTextActive: {
    color: "#fff",
  },
  chartStats: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 24,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: "#f1f5f9",
  },
  chartStat: {
    alignItems: "center",
  },
  chartStatLabel: {
    fontSize: 12,
    color: "#64748b",
    marginBottom: 4,
  },
  chartStatValue: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1e293b",
  },
  growthIndicator: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  performanceHeader: {
    marginBottom: 24,
  },
  performanceTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1e293b",
    marginBottom: 4,
  },
  performanceSubtitle: {
    fontSize: 13,
    color: "#64748b",
  },
  performanceGrid: {
    gap: 24,
  },
  performancePills: {
    marginTop: 18,
    flexDirection: "row",
    gap: 10,
  },
  performancePill: {
    flex: 1,
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  performancePillLabel: {
    fontSize: 11,
    color: "#64748b",
    fontWeight: "600",
    marginBottom: 4,
  },
  performancePillValue: {
    fontSize: 13,
    color: "#0f172a",
    fontWeight: "800",
  },
  performanceMetric: {
    flexDirection: "row",
    alignItems: "center",
    gap: 20,
  },
  gaugeContainer: {
    position: "relative",
  },
  gaugeTextContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
  },
  gaugeValue: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1e293b",
  },
  gaugeLabel: {
    fontSize: 11,
    color: "#64748b",
    marginTop: 2,
  },
  metricInfo: {
    flex: 1,
  },
  performanceMetricValue: {
    fontSize: 24,
    fontWeight: "800",
    color: "#1e293b",
    marginBottom: 4,
  },
  performanceMetricLabel: {
    fontSize: 13,
    color: "#64748b",
  },
  eventCount: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: "#f0f9ff",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 3,
    borderColor: "#e0f2fe",
  },
  eventCountNumber: {
    fontSize: 24,
    fontWeight: "800",
    color: "#0369a1",
  },
  eventCountLabel: {
    fontSize: 11,
    color: "#0ea5e9",
    marginTop: 2,
  },
  eventTrend: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  eventTrendText: {
    fontSize: 14,
    fontWeight: "600",
  },
  viewAllButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  viewAllText: {
    fontSize: 14,
    color: "#6366f1",
    fontWeight: "600",
  },
  eventsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 20,
  },
  eventCard: {
    flex: 1,
    minWidth: 280,
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: "#dbe4f3",
  },
  eventHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  eventStatus: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  eventStatusText: {
    fontSize: 11,
    fontWeight: "600",
  },
  eventRank: {
    fontSize: 14,
    fontWeight: "700",
    color: "#94a3b8",
  },
  eventName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1e293b",
    marginBottom: 16,
    lineHeight: 22,
  },
  eventMetrics: {
    flexDirection: "row",
    gap: 20,
    marginBottom: 16,
  },
  eventMetric: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  eventMetricValue: {
    fontSize: 14,
    fontWeight: "600",
    color: "#475569",
  },
  eventProgress: {
    marginTop: 8,
  },
  eventProgressBar: {
    height: 4,
    backgroundColor: "#e2e8f0",
    borderRadius: 2,
    overflow: "hidden",
    marginBottom: 6,
  },
  eventProgressFill: {
    height: "100%",
    backgroundColor: "#10b981",
    borderRadius: 2,
  },
  eventProgressText: {
    fontSize: 12,
    color: "#64748b",
  },
  eventCardActionRow: {
    marginTop: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  eventCardActionText: {
    fontSize: 12,
    color: "#334155",
    fontWeight: "700",
  },
  noEvents: {
    padding: 48,
    alignItems: "center",
    backgroundColor: "#f8fafc",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderStyle: "dashed",
  },
  noEventsText: {
    fontSize: 16,
    color: "#475569",
    fontWeight: "600",
    marginTop: 16,
    marginBottom: 8,
  },
  noEventsSubtext: {
    fontSize: 14,
    color: "#94a3b8",
    textAlign: "center",
  },
  noEventsActions: {
    marginTop: 16,
    flexDirection: "row",
    gap: 10,
  },
  noEventsPrimary: {
    minHeight: 44,
    borderRadius: 10,
    backgroundColor: "#1d4ed8",
    paddingHorizontal: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  noEventsPrimaryText: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "800",
  },
  noEventsSecondary: {
    minHeight: 44,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#cbd5e1",
    backgroundColor: "#ffffff",
    paddingHorizontal: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  noEventsSecondaryText: {
    color: "#334155",
    fontSize: 12,
    fontWeight: "700",
  },
  footer: {
    marginTop: 32,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0",
    alignItems: "center",
  },
  footerText: {
    fontSize: 12,
    color: "#94a3b8",
    fontWeight: "500",
  },
  barChartContainer: {
    justifyContent: "center",
    alignItems: "center",
  },
  chartBars: {
    flexDirection: "row",
    alignItems: "flex-end",
    height: "100%",
    gap: 16,
    paddingHorizontal: 8,
  },
  barContainer: {
    flex: 1,
    alignItems: "center",
    height: "100%",
  },
  barWrapper: {
    flex: 1,
    width: "100%",
    justifyContent: "flex-end",
    alignItems: "center",
  },
  bar: {
    width: 24,
    minHeight: 4,
    borderRadius: 6,
  },
  barValueText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#475569",
    marginTop: 8,
  },
  barLabel: {
    fontSize: 12,
    color: "#64748b",
    marginTop: 8,
  },
});

export default AdminDashboardScreen;
