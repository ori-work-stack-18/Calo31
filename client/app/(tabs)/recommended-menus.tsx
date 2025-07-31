import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
  Animated,
  Dimensions,
  Modal,
  TextInput,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { useTranslation } from "react-i18next";
import { useLanguage } from "@/src/i18n/context/LanguageContext";
import { api } from "@/src/services/api";
import {
  ChefHat,
  Plus,
  Sparkles,
  Calendar,
  Clock,
  DollarSign,
  Users,
  Target,
  Utensils,
  Star,
  Play,
  Eye,
  RefreshCw,
  Filter,
  Search,
  X,
} from "lucide-react-native";
import LoadingScreen from "@/components/LoadingScreen";
import MenuCard from "@/components/MenuCard";

const { width } = Dimensions.get("window");

export interface RecommendedMenu {
  menu_id: string;
  title: string;
  description?: string;
  total_calories: number;
  total_protein?: number;
  total_carbs?: number;
  total_fat?: number;
  days_count: number;
  estimated_cost?: number;
  meals: Array<{
    meal_id: string;
    name: string;
    meal_type: string;
    calories: number;
  }>;
  created_at: string;
}

interface GenerateMenuRequest {
  days: number;
  mealsPerDay: string;
  mealChangeFrequency: string;
  includeLeftovers: boolean;
  sameMealTimes: boolean;
  targetCalories?: number;
  dietaryPreferences?: string[];
  excludedIngredients?: string[];
  budget?: number;
}

export default function RecommendedMenusScreen() {
  const { t } = useTranslation();
  const { language, isRTL } = useLanguage();
  
  const [menus, setMenus] = useState<RecommendedMenu[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [showCustomModal, setShowCustomModal] = useState(false);
  const [customRequest, setCustomRequest] = useState("");

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;

  const [generateConfig, setGenerateConfig] = useState<GenerateMenuRequest>({
    days: 7,
    mealsPerDay: "3_main",
    mealChangeFrequency: "daily",
    includeLeftovers: false,
    sameMealTimes: true,
    budget: 200,
  });

  useEffect(() => {
    loadMenus();
  }, []);

  useEffect(() => {
    if (menus.length > 0) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 600,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [menus]);

  const loadMenus = async () => {
    try {
      console.log("📋 Loading recommended menus...");
      const response = await api.get("/recommended-menus");
      
      if (response.data.success) {
        setMenus(response.data.data || []);
        console.log("✅ Loaded", response.data.data?.length || 0, "menus");
      } else {
        console.log("⚠️ No menus found");
        setMenus([]);
      }
    } catch (error) {
      console.error("💥 Error loading menus:", error);
      setMenus([]);
    } finally {
      setIsLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadMenus();
    setRefreshing(false);
  };

  const generateMenu = async () => {
    try {
      setIsGenerating(true);
      console.log("🤖 Generating new menu with config:", generateConfig);

      const response = await api.post("/recommended-menus/generate", generateConfig);
      
      if (response.data.success) {
        Alert.alert(
          language === "he" ? "הצלחה!" : "Success!",
          language === "he" 
            ? "תפריט חדש נוצר בהצלחה!"
            : "New menu generated successfully!",
          [
            {
              text: "OK",
              onPress: () => {
                setShowGenerateModal(false);
                loadMenus();
              },
            },
          ]
        );
      } else {
        throw new Error(response.data.error || "Failed to generate menu");
      }
    } catch (error: any) {
      console.error("💥 Error generating menu:", error);
      Alert.alert(
        language === "he" ? "שגיאה" : "Error",
        error.message || (language === "he" 
          ? "נכשל ביצירת תפריט חדש"
          : "Failed to generate new menu")
      );
    } finally {
      setIsGenerating(false);
    }
  };

  const generateCustomMenu = async () => {
    if (!customRequest.trim()) {
      Alert.alert(
        language === "he" ? "שגיאה" : "Error",
        language === "he" 
          ? "אנא הכנס תיאור לתפריט המותאם"
          : "Please enter a description for your custom menu"
      );
      return;
    }

    try {
      setIsGenerating(true);
      console.log("🎨 Generating custom menu:", customRequest);

      const response = await api.post("/recommended-menus/generate-custom", {
        ...generateConfig,
        customRequest: customRequest.trim(),
      });
      
      if (response.data.success) {
        Alert.alert(
          language === "he" ? "הצלחה!" : "Success!",
          language === "he" 
            ? "תפריט מותאם נוצר בהצלחה!"
            : "Custom menu generated successfully!",
          [
            {
              text: "OK",
              onPress: () => {
                setShowCustomModal(false);
                setCustomRequest("");
                loadMenus();
              },
            },
          ]
        );
      } else {
        throw new Error(response.data.error || "Failed to generate custom menu");
      }
    } catch (error: any) {
      console.error("💥 Error generating custom menu:", error);
      Alert.alert(
        language === "he" ? "שגיאה" : "Error",
        error.message || (language === "he" 
          ? "נכשל ביצירת תפריט מותאם"
          : "Failed to generate custom menu")
      );
    } finally {
      setIsGenerating(false);
    }
  };

  const handleStartMenu = async (menuId: string) => {
    try {
      console.log("🚀 Starting menu:", menuId);
      const response = await api.post(`/recommended-menus/${menuId}/start-today`);
      
      if (response.data.success) {
        Alert.alert(
          language === "he" ? "הצלחה!" : "Success!",
          language === "he" 
            ? "התפריט הופעל בהצלחה!"
            : "Menu started successfully!"
        );
      }
    } catch (error) {
      console.error("💥 Error starting menu:", error);
      Alert.alert(
        language === "he" ? "שגיאה" : "Error",
        language === "he" 
          ? "נכשל בהפעלת התפריט"
          : "Failed to start menu"
      );
    }
  };

  if (isLoading) {
    return (
      <LoadingScreen
        text={isRTL ? "טוען תפריטים מומלצים..." : "Loading recommended menus..."}
      />
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <ChefHat size={32} color="#10b981" />
          <View style={styles.headerText}>
            <Text style={[styles.title, isRTL && styles.rtlText]}>
              {language === "he" ? "תפריטים מומלצים" : "Recommended Menus"}
            </Text>
            <Text style={[styles.subtitle, isRTL && styles.rtlText]}>
              {language === "he" 
                ? "תפריטים מותאמים אישית עבורך"
                : "Personalized meal plans just for you"}
            </Text>
          </View>
        </View>

        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.generateButton}
            onPress={() => setShowGenerateModal(true)}
            disabled={isGenerating}
          >
            {isGenerating ? (
              <ActivityIndicator size="small" color="#10b981" />
            ) : (
              <Plus size={20} color="#10b981" />
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.customButton}
            onPress={() => setShowCustomModal(true)}
            disabled={isGenerating}
          >
            <Sparkles size={20} color="#f59e0b" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Content */}
      <ScrollView
        style={styles.scrollView}
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
        {menus.length > 0 ? (
          <View style={styles.menusContainer}>
            {menus.map((menu, index) => (
              <MenuCard
                key={menu.menu_id}
                menu={menu}
                isRTL={isRTL}
                onStart={handleStartMenu}
                fadeAnim={fadeAnim}
                slideAnim={slideAnim}
                index={index}
              />
            ))}
          </View>
        ) : (
          <View style={styles.emptyState}>
            <ChefHat size={64} color="#d1d5db" />
            <Text style={[styles.emptyTitle, isRTL && styles.rtlText]}>
              {language === "he" ? "אין תפריטים עדיין" : "No Menus Yet"}
            </Text>
            <Text style={[styles.emptyText, isRTL && styles.rtlText]}>
              {language === "he" 
                ? "צור את התפריט הראשון שלך כדי להתחיל"
                : "Create your first menu to get started"}
            </Text>
            
            <View style={styles.emptyActions}>
              <TouchableOpacity
                style={styles.emptyActionButton}
                onPress={() => setShowGenerateModal(true)}
                disabled={isGenerating}
              >
                <Plus size={20} color="white" />
                <Text style={styles.emptyActionText}>
                  {language === "he" ? "צור תפריט" : "Generate Menu"}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.emptyCustomButton}
                onPress={() => setShowCustomModal(true)}
                disabled={isGenerating}
              >
                <Sparkles size={20} color="#f59e0b" />
                <Text style={styles.emptyCustomText}>
                  {language === "he" ? "תפריט מותאם" : "Custom Menu"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Generate Menu Modal */}
      <Modal
        visible={showGenerateModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowGenerateModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.generateModal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {language === "he" ? "צור תפריט חדש" : "Generate New Menu"}
              </Text>
              <TouchableOpacity onPress={() => setShowGenerateModal(false)}>
                <X size={24} color="#6b7280" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalContent}>
              {/* Days Selection */}
              <View style={styles.configSection}>
                <Text style={styles.configLabel}>
                  {language === "he" ? "מספר ימים" : "Number of Days"}
                </Text>
                <View style={styles.daysSelector}>
                  {[3, 7, 14].map((days) => (
                    <TouchableOpacity
                      key={days}
                      style={[
                        styles.dayOption,
                        generateConfig.days === days && styles.dayOptionActive,
                      ]}
                      onPress={() => setGenerateConfig(prev => ({ ...prev, days }))}
                    >
                      <Text
                        style={[
                          styles.dayOptionText,
                          generateConfig.days === days && styles.dayOptionTextActive,
                        ]}
                      >
                        {days} {language === "he" ? "ימים" : "days"}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Meals Per Day */}
              <View style={styles.configSection}>
                <Text style={styles.configLabel}>
                  {language === "he" ? "ארוחות ביום" : "Meals Per Day"}
                </Text>
                <View style={styles.mealsSelector}>
                  {[
                    { key: "3_main", label: language === "he" ? "3 ארוחות עיקריות" : "3 Main Meals" },
                    { key: "3_plus_2_snacks", label: language === "he" ? "3 ארוחות + 2 חטיפים" : "3 Meals + 2 Snacks" },
                    { key: "2_plus_1_intermediate", label: language === "he" ? "2 ארוחות + ביניים" : "2 Meals + 1 Intermediate" },
                  ].map((option) => (
                    <TouchableOpacity
                      key={option.key}
                      style={[
                        styles.mealOption,
                        generateConfig.mealsPerDay === option.key && styles.mealOptionActive,
                      ]}
                      onPress={() => setGenerateConfig(prev => ({ ...prev, mealsPerDay: option.key }))}
                    >
                      <Text
                        style={[
                          styles.mealOptionText,
                          generateConfig.mealsPerDay === option.key && styles.mealOptionTextActive,
                        ]}
                      >
                        {option.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Budget */}
              <View style={styles.configSection}>
                <Text style={styles.configLabel}>
                  {language === "he" ? "תקציב יומי (₪)" : "Daily Budget (₪)"}
                </Text>
                <View style={styles.budgetSelector}>
                  {[100, 150, 200, 300].map((budget) => (
                    <TouchableOpacity
                      key={budget}
                      style={[
                        styles.budgetOption,
                        generateConfig.budget === budget && styles.budgetOptionActive,
                      ]}
                      onPress={() => setGenerateConfig(prev => ({ ...prev, budget }))}
                    >
                      <DollarSign size={16} color={generateConfig.budget === budget ? "#10b981" : "#6b7280"} />
                      <Text
                        style={[
                          styles.budgetOptionText,
                          generateConfig.budget === budget && styles.budgetOptionTextActive,
                        ]}
                      >
                        ₪{budget}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Options */}
              <View style={styles.configSection}>
                <Text style={styles.configLabel}>
                  {language === "he" ? "אפשרויות" : "Options"}
                </Text>
                <View style={styles.optionsContainer}>
                  <TouchableOpacity
                    style={styles.optionToggle}
                    onPress={() => setGenerateConfig(prev => ({ 
                      ...prev, 
                      includeLeftovers: !prev.includeLeftovers 
                    }))}
                  >
                    <View style={[
                      styles.toggleIndicator,
                      generateConfig.includeLeftovers && styles.toggleIndicatorActive,
                    ]}>
                      {generateConfig.includeLeftovers && (
                        <View style={styles.toggleDot} />
                      )}
                    </View>
                    <Text style={styles.optionText}>
                      {language === "he" ? "כלול שאריות" : "Include Leftovers"}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.optionToggle}
                    onPress={() => setGenerateConfig(prev => ({ 
                      ...prev, 
                      sameMealTimes: !prev.sameMealTimes 
                    }))}
                  >
                    <View style={[
                      styles.toggleIndicator,
                      generateConfig.sameMealTimes && styles.toggleIndicatorActive,
                    ]}>
                      {generateConfig.sameMealTimes && (
                        <View style={styles.toggleDot} />
                      )}
                    </View>
                    <Text style={styles.optionText}>
                      {language === "he" ? "זמני ארוחה קבועים" : "Fixed Meal Times"}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </ScrollView>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setShowGenerateModal(false)}
                disabled={isGenerating}
              >
                <Text style={styles.cancelButtonText}>
                  {language === "he" ? "ביטול" : "Cancel"}
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.generateActionButton}
                onPress={generateMenu}
                disabled={isGenerating}
              >
                {isGenerating ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <Sparkles size={20} color="white" />
                )}
                <Text style={styles.generateActionText}>
                  {language === "he" ? "צור תפריט" : "Generate"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Custom Menu Modal */}
      <Modal
        visible={showCustomModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowCustomModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.customModal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {language === "he" ? "תפריט מותאם אישית" : "Custom Menu Request"}
              </Text>
              <TouchableOpacity onPress={() => setShowCustomModal(false)}>
                <X size={24} color="#6b7280" />
              </TouchableOpacity>
            </View>

            <View style={styles.customContent}>
              <Text style={styles.customDescription}>
                {language === "he" 
                  ? "תאר את התפריט שאתה רוצה ואנחנו ניצור אותו עבורך"
                  : "Describe the menu you want and we'll create it for you"}
              </Text>

              <TextInput
                style={styles.customInput}
                placeholder={language === "he" 
                  ? "לדוגמה: תפריט ים תיכוני עם דגים, ירקות טריים ושמן זית..."
                  : "e.g., Mediterranean menu with fish, fresh vegetables, and olive oil..."
                }
                placeholderTextColor="#9ca3af"
                value={customRequest}
                onChangeText={setCustomRequest}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
                textAlign={isRTL ? "right" : "left"}
              />

              <View style={styles.customTips}>
                <Text style={styles.customTipsTitle}>
                  💡 {language === "he" ? "טיפים:" : "Tips:"}
                </Text>
                <Text style={styles.customTipsText}>
                  {language === "he" 
                    ? "• ציין סוג מטבח (ים תיכוני, אסייתי, וכו')\n• הזכר הגבלות תזונתיות\n• ציין העדפות בישול\n• הוסף מטרות תזונתיות"
                    : "• Mention cuisine type (Mediterranean, Asian, etc.)\n• Include dietary restrictions\n• Specify cooking preferences\n• Add nutritional goals"}
                </Text>
              </View>
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setShowCustomModal(false)}
                disabled={isGenerating}
              >
                <Text style={styles.cancelButtonText}>
                  {language === "he" ? "ביטול" : "Cancel"}
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.customActionButton}
                onPress={generateCustomMenu}
                disabled={isGenerating || !customRequest.trim()}
              >
                {isGenerating ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <Sparkles size={20} color="white" />
                )}
                <Text style={styles.customActionText}>
                  {language === "he" ? "צור תפריט" : "Create Menu"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  headerContent: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  headerText: {
    marginLeft: 12,
    flex: 1,
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
  rtlText: {
    textAlign: "right",
    writingDirection: "rtl",
  },
  headerActions: {
    flexDirection: "row",
    gap: 8,
  },
  generateButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#ecfdf5",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#d1fae5",
  },
  customButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#fef3c7",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#fde68a",
  },
  scrollView: {
    flex: 1,
  },
  menusContainer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 40,
    marginTop: 60,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#374151",
    marginTop: 20,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 16,
    color: "#6b7280",
    textAlign: "center",
    lineHeight: 24,
    marginBottom: 32,
  },
  emptyActions: {
    flexDirection: "row",
    gap: 12,
  },
  emptyActionButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#10b981",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    gap: 8,
  },
  emptyActionText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
  emptyCustomButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ffffff",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    gap: 8,
    borderWidth: 1,
    borderColor: "#fde68a",
  },
  emptyCustomText: {
    color: "#f59e0b",
    fontSize: 16,
    fontWeight: "600",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  generateModal: {
    backgroundColor: "#ffffff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "80%",
  },
  customModal: {
    backgroundColor: "#ffffff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "70%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#1f2937",
  },
  modalContent: {
    padding: 20,
  },
  configSection: {
    marginBottom: 24,
  },
  configLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 12,
  },
  daysSelector: {
    flexDirection: "row",
    gap: 8,
  },
  dayOption: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: "#f9fafb",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    alignItems: "center",
  },
  dayOptionActive: {
    backgroundColor: "#ecfdf5",
    borderColor: "#10b981",
  },
  dayOptionText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#6b7280",
  },
  dayOptionTextActive: {
    color: "#10b981",
    fontWeight: "600",
  },
  mealsSelector: {
    gap: 8,
  },
  mealOption: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: "#f9fafb",
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  mealOptionActive: {
    backgroundColor: "#ecfdf5",
    borderColor: "#10b981",
  },
  mealOptionText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#6b7280",
    textAlign: "center",
  },
  mealOptionTextActive: {
    color: "#10b981",
    fontWeight: "600",
  },
  budgetSelector: {
    flexDirection: "row",
    gap: 8,
  },
  budgetOption: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: "#f9fafb",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    gap: 4,
  },
  budgetOptionActive: {
    backgroundColor: "#ecfdf5",
    borderColor: "#10b981",
  },
  budgetOptionText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#6b7280",
  },
  budgetOptionTextActive: {
    color: "#10b981",
    fontWeight: "600",
  },
  optionsContainer: {
    gap: 12,
  },
  optionToggle: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  toggleIndicator: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#f3f4f6",
    borderWidth: 1,
    borderColor: "#d1d5db",
    justifyContent: "center",
    alignItems: "center",
  },
  toggleIndicatorActive: {
    backgroundColor: "#10b981",
    borderColor: "#10b981",
  },
  toggleDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "white",
  },
  optionText: {
    fontSize: 14,
    color: "#374151",
    fontWeight: "500",
  },
  modalActions: {
    flexDirection: "row",
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: "#f3f4f6",
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    backgroundColor: "#f3f4f6",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#d1d5db",
  },
  cancelButtonText: {
    color: "#6b7280",
    fontSize: 16,
    fontWeight: "600",
  },
  generateActionButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    backgroundColor: "#10b981",
    gap: 8,
  },
  generateActionText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
  customContent: {
    padding: 20,
  },
  customDescription: {
    fontSize: 16,
    color: "#6b7280",
    lineHeight: 24,
    marginBottom: 20,
    textAlign: "center",
  },
  customInput: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    minHeight: 120,
    backgroundColor: "#f9fafb",
    marginBottom: 20,
  },
  customTips: {
    backgroundColor: "#f0f9ff",
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#bae6fd",
  },
  customTipsTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#0c4a6e",
    marginBottom: 8,
  },
  customTipsText: {
    fontSize: 12,
    color: "#0369a1",
    lineHeight: 18,
  },
  customActionButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    backgroundColor: "#f59e0b",
    gap: 8,
  },
  customActionText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
});