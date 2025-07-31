import React, { useState, useEffect, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { LineChart, BarChart, PieChart } from "react-native-chart-kit";
import { useTranslation } from "react-i18next";
import { useLanguage } from "@/src/i18n/context/LanguageContext";
import { useStatistics } from "@/hooks/useQueries";
import {
  TrendingUp,
  Calendar,
  Target,
  Award,
  Flame,
  Zap,
  Droplets,
  Activity,
  BarChart3,
  PieChart as PieChartIcon,
  LineChart as LineChartIcon,
  Globe,
  ChevronDown,
  RefreshCw,
} from "lucide-react-native";
import LoadingScreen from "@/components/LoadingScreen";

const { width } = Dimensions.get("window");
const chartWidth = width - 40;

const TIME_RANGES = [
  { key: "today", label: "Today", icon: Calendar },
  { key: "week", label: "This Week", icon: Calendar },
  { key: "month", label: "This Month", icon: Calendar },
  { key: "custom", label: "Custom Range", icon: Calendar },
];

const CHART_TYPES = [
  { key: "line", label: "Line Chart", icon: LineChartIcon },
  { key: "bar", label: "Bar Chart", icon: BarChart3 },
  { key: "pie", label: "Pie Chart", icon: PieChartIcon },
];

export default function StatisticsScreen() {
  const { t } = useTranslation();
  const { isRTL } = useLanguage();
  
  const [selectedTimeRange, setSelectedTimeRange] = useState("week");
  const [selectedChartType, setSelectedChartType] = useState("line");
  const [refreshing, setRefreshing] = useState(false);
  const [showTimeRangeModal, setShowTimeRangeModal] = useState(false);

  const {
    data: statisticsResponse,
    isLoading,
    error,
    refetch,
  } = useStatistics(selectedTimeRange);

  const statistics = statisticsResponse?.data;

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  // Chart configuration
  const chartConfig = {
    backgroundColor: "#ffffff",
    backgroundGradientFrom: "#ffffff",
    backgroundGradientTo: "#f8fafc",
    decimalPlaces: 0,
    color: (opacity = 1) => `rgba(16, 185, 129, ${opacity})`,
    labelColor: (opacity = 1) => `rgba(107, 114, 128, ${opacity})`,
    style: {
      borderRadius: 16,
    },
    propsForDots: {
      r: "4",
      strokeWidth: "2",
      stroke: "#10b981",
    },
    propsForBackgroundLines: {
      strokeDasharray: "",
      stroke: "#e5e7eb",
      strokeWidth: 1,
    },
  };

  // Prepare chart data
  const chartData = useMemo(() => {
    if (!statistics?.dailyBreakdown) return null;

    const dailyData = statistics.dailyBreakdown.slice(-7); // Last 7 days
    
    const labels = dailyData.map((day: any) => {
      const date = new Date(day.date);
      return date.toLocaleDateString("en-US", { weekday: "short" });
    });

    const caloriesData = dailyData.map((day: any) => day.calories || 0);
    const proteinData = dailyData.map((day: any) => day.protein_g || 0);
    const carbsData = dailyData.map((day: any) => day.carbs_g || 0);
    const fatsData = dailyData.map((day: any) => day.fats_g || 0);

    return {
      line: {
        labels,
        datasets: [
          {
            data: caloriesData,
            color: (opacity = 1) => `rgba(239, 68, 68, ${opacity})`,
            strokeWidth: 3,
          },
        ],
      },
      bar: {
        labels,
        datasets: [
          {
            data: caloriesData,
            color: (opacity = 1) => `rgba(16, 185, 129, ${opacity})`,
          },
        ],
      },
      pie: [
        {
          name: "Protein",
          population: statistics.average_protein_g || 0,
          color: "#8b5cf6",
          legendFontColor: "#374151",
          legendFontSize: 12,
        },
        {
          name: "Carbs",
          population: statistics.average_carbs_g || 0,
          color: "#f59e0b",
          legendFontColor: "#374151",
          legendFontSize: 12,
        },
        {
          name: "Fats",
          population: statistics.average_fats_g || 0,
          color: "#ef4444",
          legendFontColor: "#374151",
          legendFontSize: 12,
        },
      ],
    };
  }, [statistics]);

  if (isLoading && !statistics) {
    return <LoadingScreen text={isRTL ? "טוען סטטיסטיקות..." : "Loading statistics..."} />;
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Activity size={48} color="#ef4444" />
          <Text style={styles.errorTitle}>Failed to Load Statistics</Text>
          <Text style={styles.errorText}>
            There was an error loading your nutrition statistics.
          </Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => refetch()}>
            <RefreshCw size={20} color="white" />
            <Text style={styles.retryButtonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={["#10b981"]}
            tintColor="#10b981"
          />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>{t("statistics.title")}</Text>
            <Text style={styles.subtitle}>Track your nutrition progress</Text>
          </View>
          <TouchableOpacity
            style={styles.timeRangeButton}
            onPress={() => setShowTimeRangeModal(true)}
          >
            <Text style={styles.timeRangeText}>
              {TIME_RANGES.find(r => r.key === selectedTimeRange)?.label}
            </Text>
            <ChevronDown size={16} color="#10b981" />
          </TouchableOpacity>
        </View>

        {/* Overview Cards */}
        <View style={styles.overviewSection}>
          <View style={styles.overviewGrid}>
            <View style={styles.overviewCard}>
              <LinearGradient
                colors={["#fef2f2", "#ffffff"]}
                style={styles.overviewGradient}
              >
                <Flame size={24} color="#ef4444" />
                <Text style={styles.overviewValue}>
                  {Math.round(statistics?.average_calories || 0)}
                </Text>
                <Text style={styles.overviewLabel}>Avg Calories</Text>
              </LinearGradient>
            </View>

            <View style={styles.overviewCard}>
              <LinearGradient
                colors={["#f3e8ff", "#ffffff"]}
                style={styles.overviewGradient}
              >
                <Zap size={24} color="#8b5cf6" />
                <Text style={styles.overviewValue}>
                  {Math.round(statistics?.average_protein_g || 0)}g
                </Text>
                <Text style={styles.overviewLabel}>Avg Protein</Text>
              </LinearGradient>
            </View>

            <View style={styles.overviewCard}>
              <LinearGradient
                colors={["#ecfdf5", "#ffffff"]}
                style={styles.overviewGradient}
              >
                <Target size={24} color="#10b981" />
                <Text style={styles.overviewValue}>
                  {statistics?.totalMeals || 0}
                </Text>
                <Text style={styles.overviewLabel}>Total Meals</Text>
              </LinearGradient>
            </View>

            <View style={styles.overviewCard}>
              <LinearGradient
                colors={["#fef3c7", "#ffffff"]}
                style={styles.overviewGradient}
              >
                <Award size={24} color="#f59e0b" />
                <Text style={styles.overviewValue}>
                  {statistics?.currentStreak || 0}
                </Text>
                <Text style={styles.overviewLabel}>Day Streak</Text>
              </LinearGradient>
            </View>
          </View>
        </View>

        {/* Chart Section */}
        {chartData && (
          <View style={styles.chartSection}>
            <View style={styles.chartHeader}>
              <Text style={styles.chartTitle}>Nutrition Trends</Text>
              <View style={styles.chartTypeSelector}>
                {CHART_TYPES.map((type) => {
                  const IconComponent = type.icon;
                  return (
                    <TouchableOpacity
                      key={type.key}
                      style={[
                        styles.chartTypeButton,
                        selectedChartType === type.key && styles.chartTypeButtonActive,
                      ]}
                      onPress={() => setSelectedChartType(type.key)}
                    >
                      <IconComponent
                        size={16}
                        color={selectedChartType === type.key ? "#10b981" : "#6b7280"}
                      />
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            <View style={styles.chartContainer}>
              {selectedChartType === "line" && chartData.line && (
                <LineChart
                  data={chartData.line}
                  width={chartWidth}
                  height={220}
                  chartConfig={chartConfig}
                  bezier
                  style={styles.chart}
                />
              )}

              {selectedChartType === "bar" && chartData.bar && (
                <BarChart
                  data={chartData.bar}
                  width={chartWidth}
                  height={220}
                  chartConfig={chartConfig}
                  style={styles.chart}
                />
              )}

              {selectedChartType === "pie" && chartData.pie && (
                <PieChart
                  data={chartData.pie}
                  width={chartWidth}
                  height={220}
                  chartConfig={chartConfig}
                  accessor="population"
                  backgroundColor="transparent"
                  paddingLeft="15"
                  style={styles.chart}
                />
              )}
            </View>
          </View>
        )}

        {/* Detailed Breakdown */}
        <View style={styles.breakdownSection}>
          <Text style={styles.sectionTitle}>Detailed Breakdown</Text>
          
          <View style={styles.macronutrientCards}>
            <View style={styles.macroCard}>
              <LinearGradient
                colors={["#f3e8ff", "#ffffff"]}
                style={styles.macroGradient}
              >
                <View style={styles.macroHeader}>
                  <Zap size={20} color="#8b5cf6" />
                  <Text style={styles.macroTitle}>Protein</Text>
                </View>
                <Text style={styles.macroValue}>
                  {Math.round(statistics?.average_protein_g || 0)}g
                </Text>
                <Text style={styles.macroSubtext}>Daily Average</Text>
                <View style={styles.macroProgress}>
                  <View
                    style={[
                      styles.macroProgressFill,
                      {
                        width: `${Math.min(((statistics?.average_protein_g || 0) / 150) * 100, 100)}%`,
                        backgroundColor: "#8b5cf6",
                      },
                    ]}
                  />
                </View>
              </LinearGradient>
            </View>

            <View style={styles.macroCard}>
              <LinearGradient
                colors={["#fef3c7", "#ffffff"]}
                style={styles.macroGradient}
              >
                <View style={styles.macroHeader}>
                  <Target size={20} color="#f59e0b" />
                  <Text style={styles.macroTitle}>Carbs</Text>
                </View>
                <Text style={styles.macroValue}>
                  {Math.round(statistics?.average_carbs_g || 0)}g
                </Text>
                <Text style={styles.macroSubtext}>Daily Average</Text>
                <View style={styles.macroProgress}>
                  <View
                    style={[
                      styles.macroProgressFill,
                      {
                        width: `${Math.min(((statistics?.average_carbs_g || 0) / 250) * 100, 100)}%`,
                        backgroundColor: "#f59e0b",
                      },
                    ]}
                  />
                </View>
              </LinearGradient>
            </View>

            <View style={styles.macroCard}>
              <LinearGradient
                colors={["#fef2f2", "#ffffff"]}
                style={styles.macroGradient}
              >
                <View style={styles.macroHeader}>
                  <Droplets size={20} color="#ef4444" />
                  <Text style={styles.macroTitle}>Fats</Text>
                </View>
                <Text style={styles.macroValue}>
                  {Math.round(statistics?.average_fats_g || 0)}g
                </Text>
                <Text style={styles.macroSubtext}>Daily Average</Text>
                <View style={styles.macroProgress}>
                  <View
                    style={[
                      styles.macroProgressFill,
                      {
                        width: `${Math.min(((statistics?.average_fats_g || 0) / 70) * 100, 100)}%`,
                        backgroundColor: "#ef4444",
                      },
                    ]}
                  />
                </View>
              </LinearGradient>
            </View>
          </View>
        </View>

        {/* Additional Metrics */}
        <View style={styles.additionalMetrics}>
          <Text style={styles.sectionTitle}>Additional Metrics</Text>
          
          <View style={styles.metricsGrid}>
            <View style={styles.metricCard}>
              <View style={styles.metricIcon}>
                <Activity size={20} color="#10b981" />
              </View>
              <Text style={styles.metricValue}>
                {Math.round(statistics?.average_fiber_g || 0)}g
              </Text>
              <Text style={styles.metricLabel}>Avg Fiber</Text>
            </View>

            <View style={styles.metricCard}>
              <View style={styles.metricIcon}>
                <Droplets size={20} color="#06b6d4" />
              </View>
              <Text style={styles.metricValue}>
                {Math.round(statistics?.average_sodium_mg || 0)}mg
              </Text>
              <Text style={styles.metricLabel}>Avg Sodium</Text>
            </View>

            <View style={styles.metricCard}>
              <View style={styles.metricIcon}>
                <Target size={20} color="#f59e0b" />
              </View>
              <Text style={styles.metricValue}>
                {Math.round(statistics?.average_sugar_g || 0)}g
              </Text>
              <Text style={styles.metricLabel}>Avg Sugar</Text>
            </View>

            <View style={styles.metricCard}>
              <View style={styles.metricIcon}>
                <Droplets size={20} color="#3b82f6" />
              </View>
              <Text style={styles.metricValue}>
                {Math.round(statistics?.average_fluids_ml || 0)}ml
              </Text>
              <Text style={styles.metricLabel}>Avg Fluids</Text>
            </View>
          </View>
        </View>

        {/* Achievements */}
        {statistics?.achievements && statistics.achievements.length > 0 && (
          <View style={styles.achievementsSection}>
            <Text style={styles.sectionTitle}>Recent Achievements</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.achievementsList}>
                {statistics.achievements.slice(0, 5).map((achievement: any, index: number) => (
                  <View key={index} style={styles.achievementCard}>
                    <View style={styles.achievementIcon}>
                      <Award size={20} color="#f59e0b" />
                    </View>
                    <Text style={styles.achievementTitle}>{achievement.title}</Text>
                    <Text style={styles.achievementDescription}>
                      {achievement.description}
                    </Text>
                    <View style={styles.achievementProgress}>
                      <View
                        style={[
                          styles.achievementProgressFill,
                          {
                            width: `${(achievement.progress / achievement.max_progress) * 100}%`,
                          },
                        ]}
                      />
                    </View>
                  </View>
                ))}
              </View>
            </ScrollView>
          </View>
        )}

        {/* Insights */}
        {statistics?.insights && (
          <View style={styles.insightsSection}>
            <Text style={styles.sectionTitle}>AI Insights</Text>
            <View style={styles.insightsList}>
              {statistics.insights.slice(0, 3).map((insight: string, index: number) => (
                <View key={index} style={styles.insightCard}>
                  <TrendingUp size={16} color="#10b981" />
                  <Text style={styles.insightText}>{insight}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* No Data State */}
        {!statistics?.totalMeals && (
          <View style={styles.noDataContainer}>
            <BarChart3 size={64} color="#d1d5db" />
            <Text style={styles.noDataTitle}>No Data Available</Text>
            <Text style={styles.noDataText}>
              Start logging meals to see your nutrition statistics
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#1f2937",
  },
  subtitle: {
    fontSize: 16,
    color: "#6b7280",
    marginTop: 4,
  },
  timeRangeButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ecfdf5",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 4,
    borderWidth: 1,
    borderColor: "#d1fae5",
  },
  timeRangeText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#10b981",
  },
  overviewSection: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  overviewGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  overviewCard: {
    flex: 1,
    minWidth: "45%",
    borderRadius: 16,
    overflow: "hidden",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  overviewGradient: {
    padding: 16,
    alignItems: "center",
  },
  overviewValue: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#1f2937",
    marginTop: 8,
  },
  overviewLabel: {
    fontSize: 12,
    color: "#6b7280",
    marginTop: 4,
    fontWeight: "500",
  },
  chartSection: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  chartHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  chartTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#1f2937",
  },
  chartTypeSelector: {
    flexDirection: "row",
    backgroundColor: "#f3f4f6",
    borderRadius: 8,
    padding: 2,
  },
  chartTypeButton: {
    padding: 8,
    borderRadius: 6,
  },
  chartTypeButtonActive: {
    backgroundColor: "#ffffff",
  },
  chartContainer: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 16,
    alignItems: "center",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  chart: {
    borderRadius: 16,
  },
  breakdownSection: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#1f2937",
    marginBottom: 16,
  },
  macronutrientCards: {
    gap: 12,
  },
  macroCard: {
    borderRadius: 16,
    overflow: "hidden",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  macroGradient: {
    padding: 16,
  },
  macroHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    gap: 8,
  },
  macroTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#374151",
  },
  macroValue: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#1f2937",
    marginBottom: 4,
  },
  macroSubtext: {
    fontSize: 14,
    color: "#6b7280",
    marginBottom: 12,
  },
  macroProgress: {
    height: 6,
    backgroundColor: "#f3f4f6",
    borderRadius: 3,
    overflow: "hidden",
  },
  macroProgressFill: {
    height: "100%",
    borderRadius: 3,
  },
  additionalMetrics: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  metricsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  metricCard: {
    flex: 1,
    minWidth: "45%",
    backgroundColor: "#ffffff",
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  metricIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#f8fafc",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  metricValue: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1f2937",
  },
  metricLabel: {
    fontSize: 12,
    color: "#6b7280",
    marginTop: 4,
    textAlign: "center",
  },
  achievementsSection: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  achievementsList: {
    flexDirection: "row",
    gap: 12,
    paddingRight: 20,
  },
  achievementCard: {
    width: 160,
    backgroundColor: "#ffffff",
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  achievementIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#fef3c7",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  achievementTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1f2937",
    marginBottom: 4,
  },
  achievementDescription: {
    fontSize: 12,
    color: "#6b7280",
    marginBottom: 8,
    lineHeight: 16,
  },
  achievementProgress: {
    height: 4,
    backgroundColor: "#f3f4f6",
    borderRadius: 2,
    overflow: "hidden",
  },
  achievementProgressFill: {
    height: "100%",
    backgroundColor: "#f59e0b",
    borderRadius: 2,
  },
  insightsSection: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  insightsList: {
    gap: 12,
  },
  insightCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "#ecfdf5",
    padding: 16,
    borderRadius: 12,
    gap: 12,
    borderWidth: 1,
    borderColor: "#d1fae5",
  },
  insightText: {
    flex: 1,
    fontSize: 14,
    color: "#065f46",
    lineHeight: 20,
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 40,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#374151",
    marginTop: 16,
    marginBottom: 8,
  },
  errorText: {
    fontSize: 16,
    color: "#6b7280",
    textAlign: "center",
    lineHeight: 24,
    marginBottom: 24,
  },
  retryButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#10b981",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    gap: 8,
  },
  retryButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
  noDataContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 40,
    marginTop: 60,
  },
  noDataTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#374151",
    marginTop: 16,
    marginBottom: 8,
  },
  noDataText: {
    fontSize: 16,
    color: "#6b7280",
    textAlign: "center",
    lineHeight: 24,
  },
});