import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
  ScrollView,
  TextInput,
  Modal,
  Platform,
  SafeAreaView,
  Dimensions,
  Animated,
} from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import * as ImagePicker from "expo-image-picker";
import { BarCodeScanner } from "expo-barcode-scanner";
import { useTranslation } from "react-i18next";
import { useLanguage } from "@/src/i18n/context/LanguageContext";
import { foodScannerAPI } from "@/src/services/api";
import {
  Camera,
  Image as ImageIcon,
  Scan,
  X,
  Plus,
  Minus,
  ShoppingCart,
  Clock,
  Award,
  Zap,
  Target,
  AlertTriangle,
  CheckCircle,
  Info,
} from "lucide-react-native";
import LoadingScreen from "@/components/LoadingScreen";

const { width, height } = Dimensions.get("window");

interface ProductData {
  barcode?: string;
  name: string;
  brand?: string;
  category: string;
  nutrition_per_100g: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    fiber?: number;
    sugar?: number;
    sodium?: number;
  };
  ingredients: string[];
  allergens: string[];
  labels: string[];
  health_score?: number;
  image_url?: string;
}

interface UserAnalysis {
  compatibility_score: number;
  daily_contribution: {
    calories_percent: number;
    protein_percent: number;
    carbs_percent: number;
    fat_percent: number;
  };
  alerts: string[];
  recommendations: string[];
  health_assessment: string;
}

export default function FoodScannerScreen() {
  const { t } = useTranslation();
  const { isRTL } = useLanguage();
  
  const [permission, requestPermission] = useCameraPermissions();
  const [hasBarCodePermission, setHasBarCodePermission] = useState<boolean | null>(null);
  const [showCamera, setShowCamera] = useState(false);
  const [scanMode, setScanMode] = useState<"barcode" | "image">("barcode");
  const [scannedData, setScannedData] = useState<{
    product: ProductData;
    user_analysis: UserAnalysis;
  } | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [showAddToMealModal, setShowAddToMealModal] = useState(false);
  const [quantity, setQuantity] = useState(100);
  const [mealTiming, setMealTiming] = useState("SNACK");
  const [scanHistory, setScanHistory] = useState<any[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;

  useEffect(() => {
    (async () => {
      const { status } = await BarCodeScanner.requestPermissionsAsync();
      setHasBarCodePermission(status === "granted");
    })();
  }, []);

  useEffect(() => {
    if (scannedData) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 500,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [scannedData]);

  const loadScanHistory = async () => {
    try {
      setIsLoadingHistory(true);
      const response = await foodScannerAPI.getScannedHistory();
      if (response.success) {
        setScanHistory(response.data || []);
      }
    } catch (error) {
      console.error("Error loading scan history:", error);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const handleBarCodeScanned = async ({ data }: { data: string }) => {
    if (isScanning) return;
    
    setIsScanning(true);
    try {
      console.log("🔍 Scanning barcode:", data);
      const response = await foodScannerAPI.scanBarcode(data);
      
      if (response.success) {
        setScannedData(response.data);
        setShowCamera(false);
      } else {
        Alert.alert("Product Not Found", "We couldn't find this product in our database.");
      }
    } catch (error) {
      console.error("Barcode scan error:", error);
      Alert.alert("Scan Failed", "Failed to scan the barcode. Please try again.");
    } finally {
      setIsScanning(false);
    }
  };

  const handleImageScan = async (imageBase64: string) => {
    setIsScanning(true);
    try {
      console.log("📷 Scanning product image...");
      const response = await foodScannerAPI.scanProductImage(imageBase64);
      
      if (response.success) {
        setScannedData(response.data);
        setShowCamera(false);
      } else {
        Alert.alert("Scan Failed", "We couldn't identify the product in the image.");
      }
    } catch (error) {
      console.error("Image scan error:", error);
      Alert.alert("Scan Failed", "Failed to analyze the image. Please try again.");
    } finally {
      setIsScanning(false);
    }
  };

  const takePicture = async () => {
    if (scanMode === "image") {
      try {
        const result = await ImagePicker.launchImageLibraryAsync({
          allowsEditing: true,
          aspect: [4, 3],
          quality: 0.8,
          base64: true,
        });

        if (!result.canceled && result.assets?.[0]?.base64) {
          await handleImageScan(result.assets[0].base64);
        }
      } catch (error) {
        console.error("Error taking picture:", error);
        Alert.alert("Error", "Failed to capture image.");
      }
    }
  };

  const addToMealLog = async () => {
    if (!scannedData) return;

    try {
      const response = await foodScannerAPI.addToMealLog(
        scannedData.product,
        quantity,
        mealTiming
      );

      if (response.success) {
        Alert.alert("Success", "Product added to your meal log!");
        setShowAddToMealModal(false);
        setScannedData(null);
      } else {
        Alert.alert("Error", "Failed to add product to meal log.");
      }
    } catch (error) {
      console.error("Add to meal error:", error);
      Alert.alert("Error", "Failed to add product to meal log.");
    }
  };

  const getCompatibilityColor = (score: number) => {
    if (score >= 80) return "#10b981";
    if (score >= 60) return "#f59e0b";
    if (score >= 40) return "#ef4444";
    return "#dc2626";
  };

  const getCompatibilityIcon = (score: number) => {
    if (score >= 80) return <CheckCircle size={20} color="#10b981" />;
    if (score >= 60) return <Info size={20} color="#f59e0b" />;
    return <AlertTriangle size={20} color="#ef4444" />;
  };

  if (!permission || !hasBarCodePermission) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.permissionContainer}>
          <Scan size={80} color="#10b981" />
          <Text style={styles.permissionTitle}>Camera Permission Required</Text>
          <Text style={styles.permissionText}>
            We need camera permission to scan food products
          </Text>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={requestPermission}
          >
            <Text style={styles.primaryButtonText}>Grant Permission</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (showCamera) {
    return (
      <View style={styles.cameraContainer}>
        <CameraView
          style={styles.camera}
          onBarcodeScanned={scanMode === "barcode" ? handleBarCodeScanned : undefined}
          barcodeScannerSettings={{
            barcodeTypes: ["ean13", "ean8", "upc_a", "upc_e", "code128", "code39"],
          }}
        >
          <View style={styles.cameraOverlay}>
            {/* Header */}
            <View style={styles.cameraHeader}>
              <TouchableOpacity
                style={styles.cameraButton}
                onPress={() => setShowCamera(false)}
              >
                <X size={24} color="white" />
              </TouchableOpacity>
              
              <View style={styles.scanModeToggle}>
                <TouchableOpacity
                  style={[
                    styles.modeButton,
                    scanMode === "barcode" && styles.modeButtonActive,
                  ]}
                  onPress={() => setScanMode("barcode")}
                >
                  <Scan size={16} color={scanMode === "barcode" ? "#10b981" : "white"} />
                  <Text style={[
                    styles.modeButtonText,
                    { color: scanMode === "barcode" ? "#10b981" : "white" }
                  ]}>
                    Barcode
                  </Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[
                    styles.modeButton,
                    scanMode === "image" && styles.modeButtonActive,
                  ]}
                  onPress={() => setScanMode("image")}
                >
                  <ImageIcon size={16} color={scanMode === "image" ? "#10b981" : "white"} />
                  <Text style={[
                    styles.modeButtonText,
                    { color: scanMode === "image" ? "#10b981" : "white" }
                  ]}>
                    Image
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Scanning Area */}
            <View style={styles.scanningArea}>
              <View style={[
                styles.scanFrame,
                scanMode === "barcode" ? styles.barcodeFrame : styles.imageFrame
              ]}>
                {isScanning && (
                  <View style={styles.scanningIndicator}>
                    <ActivityIndicator size="large" color="#10b981" />
                  </View>
                )}
              </View>
              
              <Text style={styles.scanInstructions}>
                {scanMode === "barcode" 
                  ? "Point camera at the barcode"
                  : "Point camera at the nutrition label"
                }
              </Text>
            </View>

            {/* Footer */}
            <View style={styles.cameraFooter}>
              {scanMode === "image" && (
                <TouchableOpacity
                  style={styles.captureButton}
                  onPress={takePicture}
                  disabled={isScanning}
                >
                  <Camera size={24} color="white" />
                </TouchableOpacity>
              )}
            </View>
          </View>
        </CameraView>
      </View>
    );
  }

  if (scannedData) {
    const { product, user_analysis } = scannedData;
    const compatibilityColor = getCompatibilityColor(user_analysis.compatibility_score);

    return (
      <SafeAreaView style={styles.container}>
        <ScrollView style={styles.scrollContainer} showsVerticalScrollIndicator={false}>
          <Animated.View
            style={[
              styles.resultContainer,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }],
              },
            ]}
          >
            {/* Header */}
            <View style={styles.resultHeader}>
              <TouchableOpacity
                style={styles.backButton}
                onPress={() => setScannedData(null)}
              >
                <X size={24} color="#6b7280" />
              </TouchableOpacity>
              <Text style={styles.resultTitle}>Scan Results</Text>
              <TouchableOpacity
                style={styles.historyButton}
                onPress={() => {
                  loadScanHistory();
                  setShowHistory(true);
                }}
              >
                <Clock size={24} color="#10b981" />
              </TouchableOpacity>
            </View>

            {/* Product Info */}
            <View style={styles.productCard}>
              <View style={styles.productHeader}>
                <View style={styles.productInfo}>
                  <Text style={styles.productName}>{product.name}</Text>
                  {product.brand && (
                    <Text style={styles.productBrand}>{product.brand}</Text>
                  )}
                  <View style={styles.productMeta}>
                    <View style={styles.categoryBadge}>
                      <Text style={styles.categoryText}>{product.category}</Text>
                    </View>
                    {product.health_score && (
                      <View style={styles.healthScoreBadge}>
                        <Award size={12} color="#10b981" />
                        <Text style={styles.healthScoreText}>{product.health_score}/100</Text>
                      </View>
                    )}
                  </View>
                </View>
                {product.image_url && (
                  <Image source={{ uri: product.image_url }} style={styles.productImage} />
                )}
              </View>

              {/* Compatibility Score */}
              <View style={[styles.compatibilityCard, { borderColor: compatibilityColor }]}>
                <View style={styles.compatibilityHeader}>
                  {getCompatibilityIcon(user_analysis.compatibility_score)}
                  <Text style={styles.compatibilityTitle}>Compatibility Score</Text>
                  <Text style={[styles.compatibilityScore, { color: compatibilityColor }]}>
                    {user_analysis.compatibility_score}/100
                  </Text>
                </View>
                <Text style={styles.healthAssessment}>
                  {user_analysis.health_assessment}
                </Text>
              </View>

              {/* Nutrition per 100g */}
              <View style={styles.nutritionSection}>
                <Text style={styles.sectionTitle}>Nutrition per 100g</Text>
                <View style={styles.nutritionGrid}>
                  <View style={styles.nutritionItem}>
                    <Zap size={16} color="#ef4444" />
                    <Text style={styles.nutritionValue}>{product.nutrition_per_100g.calories}</Text>
                    <Text style={styles.nutritionLabel}>Calories</Text>
                  </View>
                  <View style={styles.nutritionItem}>
                    <Target size={16} color="#8b5cf6" />
                    <Text style={styles.nutritionValue}>{product.nutrition_per_100g.protein}g</Text>
                    <Text style={styles.nutritionLabel}>Protein</Text>
                  </View>
                  <View style={styles.nutritionItem}>
                    <Target size={16} color="#f59e0b" />
                    <Text style={styles.nutritionValue}>{product.nutrition_per_100g.carbs}g</Text>
                    <Text style={styles.nutritionLabel}>Carbs</Text>
                  </View>
                  <View style={styles.nutritionItem}>
                    <Target size={16} color="#06b6d4" />
                    <Text style={styles.nutritionValue}>{product.nutrition_per_100g.fat}g</Text>
                    <Text style={styles.nutritionLabel}>Fat</Text>
                  </View>
                </View>
              </View>

              {/* Daily Contribution */}
              <View style={styles.contributionSection}>
                <Text style={styles.sectionTitle}>Daily Contribution (100g)</Text>
                <View style={styles.contributionGrid}>
                  <View style={styles.contributionItem}>
                    <Text style={styles.contributionLabel}>Calories</Text>
                    <View style={styles.contributionBar}>
                      <View
                        style={[
                          styles.contributionFill,
                          {
                            width: `${Math.min(user_analysis.daily_contribution.calories_percent, 100)}%`,
                            backgroundColor: "#ef4444",
                          },
                        ]}
                      />
                    </View>
                    <Text style={styles.contributionPercent}>
                      {Math.round(user_analysis.daily_contribution.calories_percent)}%
                    </Text>
                  </View>
                  <View style={styles.contributionItem}>
                    <Text style={styles.contributionLabel}>Protein</Text>
                    <View style={styles.contributionBar}>
                      <View
                        style={[
                          styles.contributionFill,
                          {
                            width: `${Math.min(user_analysis.daily_contribution.protein_percent, 100)}%`,
                            backgroundColor: "#8b5cf6",
                          },
                        ]}
                      />
                    </View>
                    <Text style={styles.contributionPercent}>
                      {Math.round(user_analysis.daily_contribution.protein_percent)}%
                    </Text>
                  </View>
                </View>
              </View>

              {/* Alerts */}
              {user_analysis.alerts.length > 0 && (
                <View style={styles.alertsSection}>
                  <Text style={styles.sectionTitle}>⚠️ Alerts</Text>
                  {user_analysis.alerts.map((alert, index) => (
                    <View key={index} style={styles.alertItem}>
                      <AlertTriangle size={16} color="#ef4444" />
                      <Text style={styles.alertText}>{alert}</Text>
                    </View>
                  ))}
                </View>
              )}

              {/* Recommendations */}
              {user_analysis.recommendations.length > 0 && (
                <View style={styles.recommendationsSection}>
                  <Text style={styles.sectionTitle}>💡 Recommendations</Text>
                  {user_analysis.recommendations.map((recommendation, index) => (
                    <View key={index} style={styles.recommendationItem}>
                      <CheckCircle size={16} color="#10b981" />
                      <Text style={styles.recommendationText}>{recommendation}</Text>
                    </View>
                  ))}
                </View>
              )}

              {/* Ingredients */}
              {product.ingredients.length > 0 && (
                <View style={styles.ingredientsSection}>
                  <Text style={styles.sectionTitle}>Ingredients</Text>
                  <Text style={styles.ingredientsText}>
                    {product.ingredients.join(", ")}
                  </Text>
                </View>
              )}

              {/* Allergens */}
              {product.allergens.length > 0 && (
                <View style={styles.allergensSection}>
                  <Text style={styles.sectionTitle}>⚠️ Allergens</Text>
                  <View style={styles.allergensList}>
                    {product.allergens.map((allergen, index) => (
                      <View key={index} style={styles.allergenChip}>
                        <Text style={styles.allergenText}>{allergen}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}
            </View>

            {/* Action Buttons */}
            <View style={styles.actionButtons}>
              <TouchableOpacity
                style={styles.secondaryButton}
                onPress={() => setScannedData(null)}
              >
                <Text style={styles.secondaryButtonText}>Scan Another</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.primaryButton}
                onPress={() => setShowAddToMealModal(true)}
              >
                <ShoppingCart size={20} color="white" />
                <Text style={styles.primaryButtonText}>Add to Meal</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </ScrollView>

        {/* Add to Meal Modal */}
        <Modal
          visible={showAddToMealModal}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setShowAddToMealModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.addToMealModal}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Add to Meal Log</Text>
                <TouchableOpacity onPress={() => setShowAddToMealModal(false)}>
                  <X size={24} color="#6b7280" />
                </TouchableOpacity>
              </View>

              <Text style={styles.productNameInModal}>{product.name}</Text>

              {/* Quantity Selector */}
              <View style={styles.quantitySection}>
                <Text style={styles.quantityLabel}>Quantity (grams)</Text>
                <View style={styles.quantityControls}>
                  <TouchableOpacity
                    style={styles.quantityButton}
                    onPress={() => setQuantity(Math.max(10, quantity - 10))}
                  >
                    <Minus size={20} color="#10b981" />
                  </TouchableOpacity>
                  
                  <TextInput
                    style={styles.quantityInput}
                    value={quantity.toString()}
                    onChangeText={(text) => {
                      const num = parseInt(text) || 0;
                      setQuantity(Math.max(0, Math.min(1000, num)));
                    }}
                    keyboardType="numeric"
                  />
                  
                  <TouchableOpacity
                    style={styles.quantityButton}
                    onPress={() => setQuantity(Math.min(1000, quantity + 10))}
                  >
                    <Plus size={20} color="#10b981" />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Calculated Nutrition */}
              <View style={styles.calculatedNutrition}>
                <Text style={styles.calculatedTitle}>Nutrition for {quantity}g</Text>
                <View style={styles.calculatedGrid}>
                  <View style={styles.calculatedItem}>
                    <Text style={styles.calculatedValue}>
                      {Math.round((product.nutrition_per_100g.calories * quantity) / 100)}
                    </Text>
                    <Text style={styles.calculatedLabel}>Calories</Text>
                  </View>
                  <View style={styles.calculatedItem}>
                    <Text style={styles.calculatedValue}>
                      {Math.round((product.nutrition_per_100g.protein * quantity) / 100)}g
                    </Text>
                    <Text style={styles.calculatedLabel}>Protein</Text>
                  </View>
                  <View style={styles.calculatedItem}>
                    <Text style={styles.calculatedValue}>
                      {Math.round((product.nutrition_per_100g.carbs * quantity) / 100)}g
                    </Text>
                    <Text style={styles.calculatedLabel}>Carbs</Text>
                  </View>
                  <View style={styles.calculatedItem}>
                    <Text style={styles.calculatedValue}>
                      {Math.round((product.nutrition_per_100g.fat * quantity) / 100)}g
                    </Text>
                    <Text style={styles.calculatedLabel}>Fat</Text>
                  </View>
                </View>
              </View>

              {/* Meal Timing */}
              <View style={styles.mealTimingSection}>
                <Text style={styles.mealTimingLabel}>Meal Timing</Text>
                <View style={styles.mealTimingOptions}>
                  {["BREAKFAST", "LUNCH", "DINNER", "SNACK"].map((timing) => (
                    <TouchableOpacity
                      key={timing}
                      style={[
                        styles.timingOption,
                        {
                          backgroundColor: mealTiming === timing ? "#ecfdf5" : "#f9fafb",
                          borderColor: mealTiming === timing ? "#10b981" : "#e5e7eb",
                        },
                      ]}
                      onPress={() => setMealTiming(timing)}
                    >
                      <Text
                        style={[
                          styles.timingOptionText,
                          { color: mealTiming === timing ? "#10b981" : "#6b7280" },
                        ]}
                      >
                        {timing.charAt(0) + timing.slice(1).toLowerCase()}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Modal Actions */}
              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={() => setShowAddToMealModal(false)}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={styles.addButton}
                  onPress={addToMealLog}
                >
                  <Text style={styles.addButtonText}>Add to Log</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* History Modal */}
        <Modal
          visible={showHistory}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setShowHistory(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.historyModal}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Scan History</Text>
                <TouchableOpacity onPress={() => setShowHistory(false)}>
                  <X size={24} color="#6b7280" />
                </TouchableOpacity>
              </View>

              {isLoadingHistory ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color="#10b981" />
                  <Text style={styles.loadingText}>Loading history...</Text>
                </View>
              ) : scanHistory.length > 0 ? (
                <ScrollView style={styles.historyList}>
                  {scanHistory.map((item, index) => (
                    <View key={index} style={styles.historyItem}>
                      <View style={styles.historyItemContent}>
                        <Text style={styles.historyItemName}>
                          {item.product_name || item.name}
                        </Text>
                        <Text style={styles.historyItemDate}>
                          {new Date(item.created_at).toLocaleDateString()}
                        </Text>
                      </View>
                      <View style={styles.historyItemType}>
                        <Text style={styles.historyItemTypeText}>
                          {item.type === "product" ? "Product" : "Meal"}
                        </Text>
                      </View>
                    </View>
                  ))}
                </ScrollView>
              ) : (
                <View style={styles.emptyHistory}>
                  <Scan size={48} color="#d1d5db" />
                  <Text style={styles.emptyHistoryText}>No scan history yet</Text>
                </View>
              )}
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.homeContainer}>
        {/* Header */}
        <View style={styles.header}>
          <Scan size={32} color="#10b981" />
          <Text style={styles.title}>Food Scanner</Text>
          <Text style={styles.subtitle}>
            Scan barcodes or nutrition labels to get instant food information
          </Text>
        </View>

        {/* Scan Options */}
        <View style={styles.scanOptions}>
          <TouchableOpacity
            style={styles.scanOption}
            onPress={() => {
              setScanMode("barcode");
              setShowCamera(true);
            }}
          >
            <View style={styles.scanOptionIcon}>
              <Scan size={32} color="#10b981" />
            </View>
            <Text style={styles.scanOptionTitle}>Scan Barcode</Text>
            <Text style={styles.scanOptionDescription}>
              Point camera at product barcode for instant nutrition info
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.scanOption}
            onPress={() => {
              setScanMode("image");
              setShowCamera(true);
            }}
          >
            <View style={styles.scanOptionIcon}>
              <ImageIcon size={32} color="#10b981" />
            </View>
            <Text style={styles.scanOptionTitle}>Scan Label</Text>
            <Text style={styles.scanOptionDescription}>
              Photograph nutrition labels for detailed analysis
            </Text>
          </TouchableOpacity>
        </View>

        {/* History Button */}
        <TouchableOpacity
          style={styles.historyButtonMain}
          onPress={() => {
            loadScanHistory();
            setShowHistory(true);
          }}
        >
          <Clock size={20} color="#10b981" />
          <Text style={styles.historyButtonText}>View Scan History</Text>
        </TouchableOpacity>

        {/* Tips */}
        <View style={styles.tipsCard}>
          <Text style={styles.tipsTitle}>💡 Scanning Tips</Text>
          <Text style={styles.tipsText}>
            • Ensure good lighting for better accuracy{"\n"}
            • Hold camera steady and close to barcode{"\n"}
            • For nutrition labels, capture the entire label{"\n"}
            • Clean camera lens for clearer scans
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  homeContainer: {
    flex: 1,
    padding: 20,
  },
  header: {
    alignItems: "center",
    marginBottom: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#065f46",
    marginTop: 12,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: "#6b7280",
    textAlign: "center",
    lineHeight: 24,
  },
  scanOptions: {
    gap: 16,
    marginBottom: 32,
  },
  scanOption: {
    backgroundColor: "#ffffff",
    padding: 24,
    borderRadius: 16,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  scanOptionIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#ecfdf5",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  scanOptionTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#1f2937",
    marginBottom: 8,
  },
  scanOptionDescription: {
    fontSize: 14,
    color: "#6b7280",
    textAlign: "center",
    lineHeight: 20,
  },
  historyButtonMain: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#ecfdf5",
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
    gap: 8,
    borderWidth: 1,
    borderColor: "#d1fae5",
  },
  historyButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#10b981",
  },
  tipsCard: {
    backgroundColor: "#f0f9ff",
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#bae6fd",
  },
  tipsTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#0c4a6e",
    marginBottom: 12,
  },
  tipsText: {
    fontSize: 14,
    color: "#0369a1",
    lineHeight: 20,
  },
  permissionContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  permissionTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#065f46",
    marginTop: 20,
    marginBottom: 10,
  },
  permissionText: {
    fontSize: 16,
    color: "#6b7280",
    textAlign: "center",
    marginBottom: 30,
    lineHeight: 24,
  },
  primaryButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#10b981",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    gap: 8,
  },
  primaryButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
  secondaryButton: {
    flex: 1,
    backgroundColor: "#f3f4f6",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#d1d5db",
  },
  secondaryButtonText: {
    color: "#374151",
    fontSize: 16,
    fontWeight: "600",
  },
  cameraContainer: {
    flex: 1,
  },
  camera: {
    flex: 1,
  },
  cameraOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.3)",
    justifyContent: "space-between",
  },
  cameraHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
  },
  cameraButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  scanModeToggle: {
    flexDirection: "row",
    backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: 20,
    padding: 4,
  },
  modeButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    gap: 4,
  },
  modeButtonActive: {
    backgroundColor: "white",
  },
  modeButtonText: {
    fontSize: 12,
    fontWeight: "600",
  },
  scanningArea: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  scanFrame: {
    borderWidth: 2,
    borderColor: "white",
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  barcodeFrame: {
    width: width * 0.8,
    height: 120,
  },
  imageFrame: {
    width: width * 0.8,
    height: width * 0.6,
  },
  scanningIndicator: {
    position: "absolute",
    justifyContent: "center",
    alignItems: "center",
  },
  scanInstructions: {
    color: "white",
    fontSize: 16,
    textAlign: "center",
    marginTop: 20,
    maxWidth: width * 0.8,
  },
  cameraFooter: {
    alignItems: "center",
    paddingBottom: 40,
  },
  captureButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#10b981",
    justifyContent: "center",
    alignItems: "center",
  },
  scrollContainer: {
    flex: 1,
  },
  resultContainer: {
    padding: 20,
  },
  resultHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#f3f4f6",
    justifyContent: "center",
    alignItems: "center",
  },
  resultTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#1f2937",
  },
  historyButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#ecfdf5",
    justifyContent: "center",
    alignItems: "center",
  },
  productCard: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  productHeader: {
    flexDirection: "row",
    marginBottom: 16,
  },
  productInfo: {
    flex: 1,
  },
  productName: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#1f2937",
    marginBottom: 4,
  },
  productBrand: {
    fontSize: 16,
    color: "#6b7280",
    marginBottom: 8,
  },
  productMeta: {
    flexDirection: "row",
    gap: 8,
  },
  categoryBadge: {
    backgroundColor: "#f3f4f6",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  categoryText: {
    fontSize: 12,
    color: "#374151",
    fontWeight: "500",
  },
  healthScoreBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ecfdf5",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  healthScoreText: {
    fontSize: 12,
    color: "#10b981",
    fontWeight: "600",
  },
  productImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    marginLeft: 12,
  },
  compatibilityCard: {
    backgroundColor: "#f8fafc",
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 2,
  },
  compatibilityHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
    gap: 8,
  },
  compatibilityTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#374151",
    flex: 1,
  },
  compatibilityScore: {
    fontSize: 18,
    fontWeight: "bold",
  },
  healthAssessment: {
    fontSize: 14,
    color: "#6b7280",
    lineHeight: 20,
  },
  nutritionSection: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 12,
  },
  nutritionGrid: {
    flexDirection: "row",
    gap: 8,
  },
  nutritionItem: {
    flex: 1,
    backgroundColor: "#f9fafb",
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
    gap: 4,
  },
  nutritionValue: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#1f2937",
  },
  nutritionLabel: {
    fontSize: 10,
    color: "#6b7280",
    fontWeight: "500",
  },
  contributionSection: {
    marginBottom: 16,
  },
  contributionGrid: {
    gap: 12,
  },
  contributionItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  contributionLabel: {
    fontSize: 14,
    color: "#374151",
    fontWeight: "500",
    minWidth: 60,
  },
  contributionBar: {
    flex: 1,
    height: 8,
    backgroundColor: "#f3f4f6",
    borderRadius: 4,
    overflow: "hidden",
  },
  contributionFill: {
    height: "100%",
    borderRadius: 4,
  },
  contributionPercent: {
    fontSize: 12,
    color: "#6b7280",
    fontWeight: "600",
    minWidth: 40,
    textAlign: "right",
  },
  alertsSection: {
    marginBottom: 16,
  },
  alertItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    marginBottom: 8,
    padding: 12,
    backgroundColor: "#fef2f2",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#fecaca",
  },
  alertText: {
    flex: 1,
    fontSize: 14,
    color: "#dc2626",
    lineHeight: 20,
  },
  recommendationsSection: {
    marginBottom: 16,
  },
  recommendationItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    marginBottom: 8,
    padding: 12,
    backgroundColor: "#ecfdf5",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#d1fae5",
  },
  recommendationText: {
    flex: 1,
    fontSize: 14,
    color: "#065f46",
    lineHeight: 20,
  },
  ingredientsSection: {
    marginBottom: 16,
  },
  ingredientsText: {
    fontSize: 14,
    color: "#6b7280",
    lineHeight: 20,
  },
  allergensSection: {
    marginBottom: 16,
  },
  allergensList: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  allergenChip: {
    backgroundColor: "#fef2f2",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#fecaca",
  },
  allergenText: {
    fontSize: 12,
    color: "#dc2626",
    fontWeight: "500",
  },
  actionButtons: {
    flexDirection: "row",
    gap: 12,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  addToMealModal: {
    backgroundColor: "#ffffff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: "80%",
  },
  historyModal: {
    backgroundColor: "#ffffff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "70%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#1f2937",
  },
  productNameInModal: {
    fontSize: 18,
    fontWeight: "600",
    color: "#374151",
    textAlign: "center",
    marginBottom: 24,
  },
  quantitySection: {
    marginBottom: 24,
  },
  quantityLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 12,
  },
  quantityControls: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
  },
  quantityButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#ecfdf5",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#d1fae5",
  },
  quantityInput: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#1f2937",
    textAlign: "center",
    minWidth: 80,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 8,
  },
  calculatedNutrition: {
    backgroundColor: "#f8fafc",
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
  },
  calculatedTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 12,
    textAlign: "center",
  },
  calculatedGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  calculatedItem: {
    alignItems: "center",
  },
  calculatedValue: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#10b981",
  },
  calculatedLabel: {
    fontSize: 12,
    color: "#6b7280",
    marginTop: 4,
  },
  mealTimingSection: {
    marginBottom: 24,
  },
  mealTimingLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 12,
  },
  mealTimingOptions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  timingOption: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  timingOptionText: {
    fontSize: 14,
    fontWeight: "500",
  },
  modalActions: {
    flexDirection: "row",
    gap: 12,
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
  addButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    backgroundColor: "#10b981",
    alignItems: "center",
  },
  addButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 40,
  },
  loadingText: {
    fontSize: 16,
    color: "#6b7280",
    marginTop: 12,
  },
  historyList: {
    padding: 20,
  },
  historyItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    backgroundColor: "#f9fafb",
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  historyItemContent: {
    flex: 1,
  },
  historyItemName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1f2937",
    marginBottom: 4,
  },
  historyItemDate: {
    fontSize: 12,
    color: "#6b7280",
  },
  historyItemType: {
    backgroundColor: "#ecfdf5",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  historyItemTypeText: {
    fontSize: 10,
    color: "#10b981",
    fontWeight: "600",
  },
  emptyHistory: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 40,
  },
  emptyHistoryText: {
    fontSize: 16,
    color: "#6b7280",
    marginTop: 12,
  },
});