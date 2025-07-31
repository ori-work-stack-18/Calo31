import React, { useState, useRef, useEffect } from "react";
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
  FlatList,
  Animated,
  PanResponder,
} from "react-native";
import { CameraView, CameraType, useCameraPermissions } from "expo-camera";
import * as ImagePicker from "expo-image-picker";
import { useDispatch, useSelector } from "react-redux";
import { RootState, AppDispatch } from "@/src/store";
import {
  analyzeMeal,
  postMeal,
  updateMeal,
  clearPendingMeal,
  clearError,
  loadPendingMeal,
} from "@/src/store/mealSlice";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import AsyncStorage from "@react-native-async-storage/async-storage";
import i18n from "@/src/i18n";
import { 
  Search, 
  Plus, 
  Trash2, 
  Edit3, 
  Save, 
  X, 
  Calculator,
  ChefHat,
  Sparkles
} from "lucide-react-native";

// Enhanced ingredient interface
interface Ingredient {
  id: string;
  name: string;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fats_g: number;
  fiber_g?: number;
  sugar_g?: number;
  sodium_mg?: number;
  quantity?: number;
  unit?: string;
}

// Common ingredients database for autocomplete
const COMMON_INGREDIENTS = [
  { name: "Chicken Breast", calories: 165, protein_g: 31, carbs_g: 0, fats_g: 3.6 },
  { name: "Brown Rice", calories: 112, protein_g: 2.6, carbs_g: 23, fats_g: 0.9 },
  { name: "Broccoli", calories: 34, protein_g: 2.8, carbs_g: 7, fats_g: 0.4 },
  { name: "Salmon", calories: 208, protein_g: 22, carbs_g: 0, fats_g: 12 },
  { name: "Avocado", calories: 160, protein_g: 2, carbs_g: 9, fats_g: 15 },
  { name: "Sweet Potato", calories: 86, protein_g: 1.6, carbs_g: 20, fats_g: 0.1 },
  { name: "Quinoa", calories: 120, protein_g: 4.4, carbs_g: 22, fats_g: 1.9 },
  { name: "Greek Yogurt", calories: 59, protein_g: 10, carbs_g: 3.6, fats_g: 0.4 },
  { name: "Spinach", calories: 23, protein_g: 2.9, carbs_g: 3.6, fats_g: 0.4 },
  { name: "Almonds", calories: 579, protein_g: 21, carbs_g: 22, fats_g: 50 },
  { name: "Banana", calories: 89, protein_g: 1.1, carbs_g: 23, fats_g: 0.3 },
  { name: "Olive Oil", calories: 884, protein_g: 0, carbs_g: 0, fats_g: 100 },
  { name: "Eggs", calories: 155, protein_g: 13, carbs_g: 1.1, fats_g: 11 },
  { name: "Oats", calories: 389, protein_g: 17, carbs_g: 66, fats_g: 7 },
  { name: "Tomato", calories: 18, protein_g: 0.9, carbs_g: 3.9, fats_g: 0.2 },
];

export default function CameraScreen() {
  const { t } = useTranslation();
  const dispatch = useDispatch<AppDispatch>();
  const { pendingMeal, isAnalyzing, isPosting, isUpdating, error } =
    useSelector((state: RootState) => state.meal);

  const [permission, requestPermission] = useCameraPermissions();
  const [showCamera, setShowCamera] = useState(false);
  const [facing, setFacing] = useState<CameraType>("back");
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [updateText, setUpdateText] = useState("");
  const [postedMealId, setPostedMealId] = useState<string | null>(null);
  const [originalImageBase64, setOriginalImageBase64] = useState<string>("");
  const cameraRef = useRef<CameraView>(null);

  // New states for ingredient editing
  const [editedIngredients, setEditedIngredients] = useState<Ingredient[]>([]);
  const [showIngredientModal, setShowIngredientModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filteredIngredients, setFilteredIngredients] = useState(COMMON_INGREDIENTS);
  const [isEditingMeal, setIsEditingMeal] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Load pending meal on component mount
  useEffect(() => {
    dispatch(loadPendingMeal());
  }, [dispatch]);

  // Handle errors
  useEffect(() => {
    if (error) {
      Alert.alert("Error", error, [
        { text: "OK", onPress: () => dispatch(clearError()) },
      ]);
    }
  }, [error, dispatch]);

  // Initialize edited ingredients when pending meal changes
  useEffect(() => {
    if (pendingMeal?.analysis?.ingredients) {
      const ingredients = Array.isArray(pendingMeal.analysis.ingredients)
        ? pendingMeal.analysis.ingredients.map((ing: any, index: number) => ({
            id: `${index}-${ing.name || 'ingredient'}`,
            name: ing.name || `Ingredient ${index + 1}`,
            calories: Number(ing.calories) || 0,
            protein_g: Number(ing.protein_g || ing.protein) || 0,
            carbs_g: Number(ing.carbs_g || ing.carbs) || 0,
            fats_g: Number(ing.fats_g || ing.fat || ing.fats) || 0,
            fiber_g: Number(ing.fiber_g || ing.fiber) || 0,
            sugar_g: Number(ing.sugar_g || ing.sugar) || 0,
            sodium_mg: Number(ing.sodium_mg || ing.sodium) || 0,
            quantity: Number(ing.quantity) || 100,
            unit: ing.unit || 'g',
          }))
        : [];
      setEditedIngredients(ingredients);
      setHasUnsavedChanges(false);
    }
  }, [pendingMeal]);

  // Filter ingredients based on search
  useEffect(() => {
    if (searchQuery.trim() === "") {
      setFilteredIngredients(COMMON_INGREDIENTS);
    } else {
      const filtered = COMMON_INGREDIENTS.filter(ingredient =>
        ingredient.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredIngredients(filtered);
    }
  }, [searchQuery]);

  // Request media library permissions on mount
  useEffect(() => {
    (async () => {
      if (Platform.OS !== "web") {
        const { status } =
          await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== "granted") {
          console.log("Media library permission not granted");
        }
      }
    })();
  }, []);

  // Check if we have a persisted meal ID
  useEffect(() => {
    const checkPersistedMealId = async () => {
      try {
        const savedMealId = await AsyncStorage.getItem("postedMealId");
        if (savedMealId && pendingMeal) {
          setPostedMealId(savedMealId);
        }
      } catch (error) {
        console.error("Error loading persisted meal ID:", error);
      }
    };

    if (pendingMeal) {
      checkPersistedMealId();
      if (pendingMeal.image_base_64) {
        setOriginalImageBase64(pendingMeal.image_base_64);
      }
    }
  }, [pendingMeal]);

  const saveMealId = async (mealId: string) => {
    try {
      await AsyncStorage.setItem("postedMealId", mealId);
    } catch (error) {
      console.error("Error saving meal ID:", error);
    }
  };

  const clearMealId = async () => {
    try {
      await AsyncStorage.removeItem("postedMealId");
    } catch (error) {
      console.error("Error clearing meal ID:", error);
    }
  };

  const validateAndProcessImage = (base64Data: string): string | null => {
    try {
      if (!base64Data || base64Data.trim() === "") {
        return null;
      }

      let cleanBase64 = base64Data;
      if (base64Data.startsWith("data:image/")) {
        const commaIndex = base64Data.indexOf(",");
        if (commaIndex !== -1) {
          cleanBase64 = base64Data.substring(commaIndex + 1);
        }
      }

      const base64Regex = /^[A-Za-z0-9+/]*={0,2}$/;
      if (!base64Regex.test(cleanBase64)) {
        return null;
      }

      if (cleanBase64.length < 1000) {
        return null;
      }

      return cleanBase64;
    } catch (error) {
      console.error("Error validating image:", error);
      return null;
    }
  };

  const analyzeImage = async (base64Image: string) => {
    try {
      const currentLanguage = i18n.language || "en";
      const validatedBase64 = validateAndProcessImage(base64Image);

      if (!validatedBase64) {
        Alert.alert("Error", "Invalid image. Please try again.");
        return;
      }

      setOriginalImageBase64(validatedBase64);
      setPostedMealId(null);
      await clearMealId();

      const result = await dispatch(
        analyzeMeal({
          imageBase64: validatedBase64,
          language: currentLanguage,
        })
      );

      if (!analyzeMeal.fulfilled.match(result)) {
        Alert.alert("Error", "Analysis failed. Please try again.");
      }
    } catch (error) {
      console.error("Analysis error:", error);
      Alert.alert("Error", "Analysis failed. Please try again.");
    }
  };

  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
        base64: true,
        exif: false,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        if (asset.base64) {
          await analyzeImage(asset.base64);
        } else {
          Alert.alert("Error", "No image data available.");
        }
      }
    } catch (error) {
      console.error("Error in pickImage:", error);
      Alert.alert("Error", "Failed to pick image.");
    }
  };

  const takePicture = async () => {
    if (cameraRef.current && !isAnalyzing) {
      try {
        const photo = await cameraRef.current.takePictureAsync({
          quality: 0.8,
          base64: true,
        });

        if (photo && photo.base64) {
          setShowCamera(false);
          await analyzeImage(photo.base64);
        } else {
          Alert.alert("Error", "Failed to capture image.");
        }
      } catch (error) {
        console.error("Camera error:", error);
        Alert.alert("Error", "Failed to capture image.");
      }
    }
  };

  // Calculate total nutrition from edited ingredients
  const calculateTotalNutrition = (ingredients: Ingredient[]) => {
    return ingredients.reduce(
      (total, ingredient) => ({
        calories: total.calories + (ingredient.calories || 0),
        protein_g: total.protein_g + (ingredient.protein_g || 0),
        carbs_g: total.carbs_g + (ingredient.carbs_g || 0),
        fats_g: total.fats_g + (ingredient.fats_g || 0),
        fiber_g: total.fiber_g + (ingredient.fiber_g || 0),
        sugar_g: total.sugar_g + (ingredient.sugar_g || 0),
        sodium_mg: total.sodium_mg + (ingredient.sodium_mg || 0),
      }),
      {
        calories: 0,
        protein_g: 0,
        carbs_g: 0,
        fats_g: 0,
        fiber_g: 0,
        sugar_g: 0,
        sodium_mg: 0,
      }
    );
  };

  // Add new ingredient
  const addIngredient = (ingredient: any) => {
    const newIngredient: Ingredient = {
      id: `${Date.now()}-${ingredient.name}`,
      name: ingredient.name,
      calories: ingredient.calories,
      protein_g: ingredient.protein_g,
      carbs_g: ingredient.carbs_g,
      fats_g: ingredient.fats_g,
      fiber_g: ingredient.fiber_g || 0,
      sugar_g: ingredient.sugar_g || 0,
      sodium_mg: ingredient.sodium_mg || 0,
      quantity: 100,
      unit: 'g',
    };

    setEditedIngredients(prev => [...prev, newIngredient]);
    setHasUnsavedChanges(true);
    setShowIngredientModal(false);
    setSearchQuery("");
  };

  // Remove ingredient with animation
  const removeIngredient = (ingredientId: string) => {
    setEditedIngredients(prev => prev.filter(ing => ing.id !== ingredientId));
    setHasUnsavedChanges(true);
  };

  // Update ingredient quantity
  const updateIngredientQuantity = (ingredientId: string, quantity: number) => {
    setEditedIngredients(prev =>
      prev.map(ing =>
        ing.id === ingredientId
          ? { ...ing, quantity: Math.max(0, quantity) }
          : ing
      )
    );
    setHasUnsavedChanges(true);
  };

  // Save edited meal
  const saveEditedMeal = async () => {
    if (!pendingMeal || !hasUnsavedChanges) return;

    try {
      const totalNutrition = calculateTotalNutrition(editedIngredients);
      
      // Update the pending meal with new data
      const updatedAnalysis = {
        ...pendingMeal.analysis,
        ...totalNutrition,
        ingredients: editedIngredients,
        meal_name: pendingMeal.analysis?.meal_name || "Edited Meal",
      };

      // Save to local storage
      const updatedPendingMeal = {
        ...pendingMeal,
        analysis: updatedAnalysis,
        timestamp: Date.now(),
      };

      await AsyncStorage.setItem("pendingMeal", JSON.stringify(updatedPendingMeal));

      // If meal is already posted, update it on server
      if (postedMealId) {
        const updateResult = await dispatch(
          updateMeal({
            meal_id: postedMealId,
            updateText: `Updated ingredients: ${editedIngredients.map(ing => ing.name).join(", ")}`,
          })
        );

        if (updateMeal.fulfilled.match(updateResult)) {
          Alert.alert("Success", "Meal updated successfully!");
        }
      }

      setHasUnsavedChanges(false);
      setIsEditingMeal(false);
      
      // Reload the pending meal to reflect changes
      dispatch(loadPendingMeal());
      
    } catch (error) {
      console.error("Error saving edited meal:", error);
      Alert.alert("Error", "Failed to save changes.");
    }
  };

  const handlePost = async () => {
    if (pendingMeal && !isPosting) {
      const result = await dispatch(postMeal());

      if (postMeal.fulfilled.match(result)) {
        const mealId = result.payload?.meal_id?.toString();
        if (mealId) {
          setPostedMealId(mealId);
          await saveMealId(mealId);
          Alert.alert("Success", "Meal saved successfully!");
        }
      } else {
        Alert.alert("Error", "Failed to save meal.");
      }
    }
  };

  const handleUpdate = () => {
    if (!postedMealId) {
      Alert.alert("Error", "Please save the meal first before updating.");
      return;
    }
    setShowUpdateModal(true);
    setUpdateText("");
  };

  const handleUpdateSubmit = async () => {
    if (!postedMealId || !updateText.trim()) {
      Alert.alert("Error", "Please enter update text.");
      return;
    }

    try {
      const result = await dispatch(
        updateMeal({
          meal_id: postedMealId,
          updateText: updateText.trim(),
        })
      );

      if (updateMeal.fulfilled.match(result)) {
        Alert.alert("Success", "Meal updated successfully!");
        setShowUpdateModal(false);
        setUpdateText("");

        // Clear the current state and reload the updated meal
        dispatch(clearPendingMeal());
        setPostedMealId(null);
        setOriginalImageBase64("");
        await clearMealId();

        // Reload the updated meal if available in the result
        if (result.payload) {
          dispatch(loadPendingMeal());
        }
      } else {
        Alert.alert("Error", "Failed to update meal.");
      }
    } catch (error) {
      console.error("Update error:", error);
      Alert.alert("Error", "Failed to update meal.");
    }
  };

  const handleDiscard = async () => {
    if (hasUnsavedChanges) {
      Alert.alert(
        "Unsaved Changes",
        "You have unsaved changes. Are you sure you want to discard them?",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Discard",
            style: "destructive",
            onPress: () => {
              dispatch(clearPendingMeal());
              setPostedMealId(null);
              setOriginalImageBase64("");
              setEditedIngredients([]);
              setHasUnsavedChanges(false);
              setIsEditingMeal(false);
              clearMealId();
            },
          },
        ]
      );
    } else {
      Alert.alert("Confirm", "Are you sure you want to discard this analysis?", [
        { text: "Cancel", style: "cancel" },
        {
          text: "Discard",
          style: "destructive",
          onPress: async () => {
            dispatch(clearPendingMeal());
            setPostedMealId(null);
            setOriginalImageBase64("");
            setEditedIngredients([]);
            setHasUnsavedChanges(false);
            setIsEditingMeal(false);
            await clearMealId();
          },
        },
      ]);
    }
  };

  // Draggable ingredient card component
  const IngredientCard = ({ ingredient, index }: { ingredient: Ingredient; index: number }) => {
    const pan = useRef(new Animated.ValueXY()).current;
    const scale = useRef(new Animated.Value(1)).current;

    const panResponder = useRef(
      PanResponder.create({
        onMoveShouldSetPanResponder: (evt, gestureState) => {
          return Math.abs(gestureState.dx) > 20 || Math.abs(gestureState.dy) > 20;
        },
        onPanResponderGrant: () => {
          Animated.spring(scale, {
            toValue: 1.05,
            useNativeDriver: false,
          }).start();
        },
        onPanResponderMove: Animated.event([null, { dx: pan.x, dy: pan.y }], {
          useNativeDriver: false,
        }),
        onPanResponderRelease: (evt, gestureState) => {
          Animated.spring(scale, {
            toValue: 1,
            useNativeDriver: false,
          }).start();

          // If dragged far enough, remove the ingredient
          if (Math.abs(gestureState.dx) > 100 || Math.abs(gestureState.dy) > 100) {
            Alert.alert(
              "Remove Ingredient",
              `Remove ${ingredient.name} from the meal?`,
              [
                { text: "Cancel", style: "cancel" },
                {
                  text: "Remove",
                  style: "destructive",
                  onPress: () => removeIngredient(ingredient.id),
                },
              ]
            );
          }

          // Reset position
          Animated.spring(pan, {
            toValue: { x: 0, y: 0 },
            useNativeDriver: false,
          }).start();
        },
      })
    ).current;

    return (
      <Animated.View
        style={[
          styles.ingredientCard,
          {
            transform: [
              { translateX: pan.x },
              { translateY: pan.y },
              { scale: scale },
            ],
          },
        ]}
        {...panResponder.panHandlers}
      >
        <View style={styles.ingredientHeader}>
          <Text style={styles.ingredientName}>{ingredient.name}</Text>
          <TouchableOpacity
            style={styles.removeButton}
            onPress={() => removeIngredient(ingredient.id)}
          >
            <Trash2 size={16} color="#ef4444" />
          </TouchableOpacity>
        </View>
        
        <View style={styles.ingredientNutrition}>
          <View style={styles.nutritionItem}>
            <Text style={styles.nutritionValue}>{Math.round(ingredient.calories)}</Text>
            <Text style={styles.nutritionLabel}>Cal</Text>
          </View>
          <View style={styles.nutritionItem}>
            <Text style={styles.nutritionValue}>{Math.round(ingredient.protein_g)}g</Text>
            <Text style={styles.nutritionLabel}>Protein</Text>
          </View>
          <View style={styles.nutritionItem}>
            <Text style={styles.nutritionValue}>{Math.round(ingredient.carbs_g)}g</Text>
            <Text style={styles.nutritionLabel}>Carbs</Text>
          </View>
          <View style={styles.nutritionItem}>
            <Text style={styles.nutritionValue}>{Math.round(ingredient.fats_g)}g</Text>
            <Text style={styles.nutritionLabel}>Fat</Text>
          </View>
        </View>

        <View style={styles.quantityContainer}>
          <Text style={styles.quantityLabel}>Quantity:</Text>
          <TextInput
            style={styles.quantityInput}
            value={ingredient.quantity?.toString() || "100"}
            onChangeText={(text) => {
              const quantity = parseInt(text) || 0;
              updateIngredientQuantity(ingredient.id, quantity);
            }}
            keyboardType="numeric"
            placeholder="100"
          />
          <Text style={styles.quantityUnit}>{ingredient.unit || 'g'}</Text>
        </View>
      </Animated.View>
    );
  };

  if (!permission) {
    return <View style={styles.container} />;
  }

  if (!permission.granted) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.permissionContainer}>
          <Ionicons name="camera" size={80} color="#10b981" />
          <Text style={styles.permissionTitle}>Camera Permission Required</Text>
          <Text style={styles.permissionText}>
            We need camera permission to analyze your meals
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
        <CameraView style={styles.camera} facing={facing} ref={cameraRef}>
          <View style={styles.cameraOverlay}>
            <View style={styles.cameraHeader}>
              <TouchableOpacity
                style={styles.cameraButton}
                onPress={() => setShowCamera(false)}
              >
                <Ionicons name="close" size={24} color="white" />
              </TouchableOpacity>
              <Text style={styles.cameraTitle}>Take Picture</Text>
              <TouchableOpacity
                style={styles.cameraButton}
                onPress={() =>
                  setFacing((current) =>
                    current === "back" ? "front" : "back"
                  )
                }
              >
                <Ionicons name="camera-reverse" size={24} color="white" />
              </TouchableOpacity>
            </View>

            <View style={styles.cameraCenter}>
              <View style={styles.focusFrame} />
              <Text style={styles.focusText}>
                Position your meal within the frame for best results
              </Text>
            </View>

            <View style={styles.cameraFooter}>
              <TouchableOpacity
                style={[
                  styles.captureButton,
                  (isAnalyzing) && styles.captureButtonDisabled,
                ]}
                onPress={takePicture}
                disabled={isAnalyzing}
              >
                <View style={styles.captureButtonInner} />
              </TouchableOpacity>
            </View>
          </View>
        </CameraView>
      </View>
    );
  }

  if (pendingMeal) {
    const isPosted = !!postedMealId;
    const totalNutrition = calculateTotalNutrition(editedIngredients);

    return (
      <SafeAreaView style={styles.container}>
        <ScrollView
          style={styles.scrollContainer}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.analysisContainer}>
            {/* Image Display */}
            <View style={styles.imageCard}>
              <Image
                source={{
                  uri: `data:image/jpeg;base64,${pendingMeal.image_base_64}`,
                }}
                style={styles.mealImage}
              />
              <View style={styles.statusBadge}>
                <Ionicons
                  name={isPosted ? "checkmark-circle" : "analytics"}
                  size={16}
                  color="white"
                />
                <Text style={styles.statusText}>
                  {isPosted ? "Meal Saved" : "Analyzed"}
                </Text>
              </View>
              {hasUnsavedChanges && (
                <View style={styles.unsavedBadge}>
                  <Edit3 size={12} color="white" />
                  <Text style={styles.unsavedText}>Unsaved</Text>
                </View>
              )}
            </View>

            {/* Analysis Results */}
            <View style={styles.analysisCard}>
              <View style={styles.mealHeader}>
                <Text style={styles.mealName}>
                  {pendingMeal.analysis?.meal_name ||
                    pendingMeal.analysis?.description ||
                    "Analyzed Meal"}
                </Text>
                <TouchableOpacity
                  style={styles.editButton}
                  onPress={() => setIsEditingMeal(!isEditingMeal)}
                >
                  <Edit3 size={20} color="#10b981" />
                  <Text style={styles.editButtonText}>
                    {isEditingMeal ? "Done" : "Edit"}
                  </Text>
                </TouchableOpacity>
              </View>

              {pendingMeal.analysis?.description && (
                <Text style={styles.mealDescription}>
                  {pendingMeal.analysis.description}
                </Text>
              )}

              {/* Updated Nutrition Facts */}
              <View style={styles.nutritionSection}>
                <View style={styles.nutritionHeader}>
                  <Text style={styles.sectionTitle}>Nutrition Facts</Text>
                  {isEditingMeal && (
                    <View style={styles.calculatorIcon}>
                      <Calculator size={16} color="#10b981" />
                      <Text style={styles.calculatedText}>Calculated</Text>
                    </View>
                  )}
                </View>
                <View style={styles.nutritionGrid}>
                  <View style={styles.nutritionItem}>
                    <Ionicons name="flame" size={20} color="#ef4444" />
                    <Text style={styles.nutritionValue}>
                      {Math.round(isEditingMeal ? totalNutrition.calories : (pendingMeal.analysis?.calories || 0))}
                    </Text>
                    <Text style={styles.nutritionLabel}>Calories</Text>
                  </View>
                  <View style={styles.nutritionItem}>
                    <Ionicons name="fitness" size={20} color="#8b5cf6" />
                    <Text style={styles.nutritionValue}>
                      {Math.round(isEditingMeal ? totalNutrition.protein_g : (pendingMeal.analysis?.protein_g || 0))}g
                    </Text>
                    <Text style={styles.nutritionLabel}>Protein</Text>
                  </View>
                  <View style={styles.nutritionItem}>
                    <Ionicons name="leaf" size={20} color="#f59e0b" />
                    <Text style={styles.nutritionValue}>
                      {Math.round(isEditingMeal ? totalNutrition.carbs_g : (pendingMeal.analysis?.carbs_g || 0))}g
                    </Text>
                    <Text style={styles.nutritionLabel}>Carbs</Text>
                  </View>
                  <View style={styles.nutritionItem}>
                    <Ionicons name="water" size={20} color="#06b6d4" />
                    <Text style={styles.nutritionValue}>
                      {Math.round(isEditingMeal ? totalNutrition.fats_g : (pendingMeal.analysis?.fats_g || 0))}g
                    </Text>
                    <Text style={styles.nutritionLabel}>Fats</Text>
                  </View>
                </View>
              </View>

              {/* Ingredients Section */}
              <View style={styles.ingredientsSection}>
                <View style={styles.ingredientsHeader}>
                  <Text style={styles.sectionTitle}>Ingredients</Text>
                  {isEditingMeal && (
                    <TouchableOpacity
                      style={styles.addIngredientButton}
                      onPress={() => setShowIngredientModal(true)}
                    >
                      <Plus size={16} color="white" />
                      <Text style={styles.addIngredientText}>Add</Text>
                    </TouchableOpacity>
                  )}
                </View>

                {isEditingMeal ? (
                  <View style={styles.editableIngredients}>
                    <Text style={styles.dragHint}>
                      💡 Drag ingredients away to remove them
                    </Text>
                    <FlatList
                      data={editedIngredients}
                      keyExtractor={(item) => item.id}
                      renderItem={({ item, index }) => (
                        <IngredientCard ingredient={item} index={index} />
                      )}
                      scrollEnabled={false}
                      showsVerticalScrollIndicator={false}
                    />
                  </View>
                ) : (
                  <View style={styles.ingredientsList}>
                    {(pendingMeal.analysis?.ingredients || []).map((ingredient: any, index: number) => (
                      <View key={index} style={styles.ingredientItem}>
                        <Text style={styles.ingredientName}>
                          {ingredient.name || `Ingredient ${index + 1}`}
                        </Text>
                        <Text style={styles.ingredientCalories}>
                          {Math.round(ingredient.calories || 0)} cal
                        </Text>
                      </View>
                    ))}
                  </View>
                )}
              </View>

              {/* Health Notes */}
              {pendingMeal.analysis?.health_risk_notes && (
                <View style={styles.healthSection}>
                  <Text style={styles.sectionTitle}>Health Insights</Text>
                  <Text style={styles.healthText}>
                    {pendingMeal.analysis.health_risk_notes}
                  </Text>
                </View>
              )}
            </View>

            {/* Action Buttons */}
            <View style={styles.actionButtons}>
              <TouchableOpacity
                style={[styles.actionButton, styles.discardButton]}
                onPress={handleDiscard}
                disabled={isPosting || isUpdating}
              >
                <Trash2 size={20} color="#dc2626" />
                <Text style={styles.discardButtonText}>
                  {isPosted ? "Clear" : "Discard"}
                </Text>
              </TouchableOpacity>

              {hasUnsavedChanges && (
                <TouchableOpacity
                  style={[styles.actionButton, styles.saveChangesButton]}
                  onPress={saveEditedMeal}
                  disabled={isPosting || isUpdating}
                >
                  <Save size={20} color="white" />
                  <Text style={styles.saveChangesButtonText}>Save Changes</Text>
                </TouchableOpacity>
              )}

              {!isPosted ? (
                <TouchableOpacity
                  style={[styles.actionButton, styles.primaryButton]}
                  onPress={handlePost}
                  disabled={isPosting || isUpdating}
                >
                  {isPosting ? (
                    <ActivityIndicator color="white" size="small" />
                  ) : (
                    <Ionicons name="checkmark-circle" size={20} color="white" />
                  )}
                  <Text style={styles.primaryButtonText}>Save</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={[styles.actionButton, styles.primaryButton]}
                  onPress={handleUpdate}
                  disabled={isPosting || isUpdating}
                >
                  {isUpdating ? (
                    <ActivityIndicator color="white" size="small" />
                  ) : (
                    <Ionicons name="refresh" size={20} color="white" />
                  )}
                  <Text style={styles.primaryButtonText}>Update</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Ingredient Search Modal */}
          <Modal
            visible={showIngredientModal}
            animationType="slide"
            transparent={true}
            onRequestClose={() => setShowIngredientModal(false)}
          >
            <View style={styles.modalOverlay}>
              <View style={styles.ingredientModal}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Add Ingredient</Text>
                  <TouchableOpacity
                    style={styles.modalCloseButton}
                    onPress={() => setShowIngredientModal(false)}
                  >
                    <X size={24} color="#666" />
                  </TouchableOpacity>
                </View>

                <View style={styles.searchContainer}>
                  <Search size={20} color="#666" />
                  <TextInput
                    style={styles.searchInput}
                    placeholder="Search ingredients..."
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    autoFocus={true}
                  />
                </View>

                <FlatList
                  data={filteredIngredients}
                  keyExtractor={(item) => item.name}
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      style={styles.ingredientOption}
                      onPress={() => addIngredient(item)}
                    >
                      <View style={styles.ingredientOptionContent}>
                        <Text style={styles.ingredientOptionName}>{item.name}</Text>
                        <Text style={styles.ingredientOptionNutrition}>
                          {item.calories} cal • {item.protein_g}g protein • {item.carbs_g}g carbs
                        </Text>
                      </View>
                      <Plus size={20} color="#10b981" />
                    </TouchableOpacity>
                  )}
                  style={styles.ingredientsList}
                />
              </View>
            </View>
          </Modal>

          {/* Update Modal */}
          <Modal
            visible={showUpdateModal}
            animationType="slide"
            transparent={true}
            onRequestClose={() => setShowUpdateModal(false)}
          >
            <View style={styles.modalOverlay}>
              <View style={styles.modal}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Update Analysis</Text>
                  <TouchableOpacity
                    style={styles.modalCloseButton}
                    onPress={() => setShowUpdateModal(false)}
                  >
                    <Ionicons name="close" size={24} color="#666" />
                  </TouchableOpacity>
                </View>

                <Text style={styles.modalSubtitle}>
                  Add additional information to improve the analysis
                </Text>

                <TextInput
                  style={styles.textInput}
                  placeholder="Enter additional details..."
                  placeholderTextColor="#999"
                  value={updateText}
                  onChangeText={setUpdateText}
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                  autoFocus={true}
                />

                <View style={styles.modalButtons}>
                  <TouchableOpacity
                    style={styles.cancelButton}
                    onPress={() => setShowUpdateModal(false)}
                    disabled={isUpdating}
                  >
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.primaryButton}
                    onPress={handleUpdateSubmit}
                    disabled={!updateText.trim() || isUpdating}
                  >
                    {isUpdating ? (
                      <ActivityIndicator color="white" size="small" />
                    ) : (
                      <Text style={styles.primaryButtonText}>Update</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </Modal>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.homeContainer}>
        <View style={styles.header}>
          <ChefHat size={32} color="#10b981" />
          <Text style={styles.title}>Smart Food Analysis</Text>
          <Text style={styles.subtitle}>
            Discover nutrition insights with AI-powered food recognition
          </Text>
        </View>

        {(isAnalyzing) && (
          <View style={styles.analyzingCard}>
            <ActivityIndicator size="large" color="#10b981" />
            <Sparkles size={24} color="#10b981" />
            <Text style={styles.analyzingTitle}>
              Analyzing Your Meal
            </Text>
            <Text style={styles.analyzingText}>
              Please wait while we process your image...
            </Text>
          </View>
        )}

        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[
              styles.mainButton,
              styles.primaryButton,
              (isAnalyzing) && styles.buttonDisabled,
            ]}
            onPress={() => setShowCamera(true)}
            disabled={isAnalyzing}
          >
            <Ionicons name="camera" size={24} color="white" />
            <Text style={styles.primaryButtonText}>Take Picture</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.mainButton,
              styles.secondaryButton,
              (isAnalyzing) && styles.buttonDisabled,
            ]}
            onPress={pickImage}
            disabled={isAnalyzing}
          >
            <Ionicons name="images" size={24} color="#10b981" />
            <Text style={styles.secondaryButtonText}>Choose from Gallery</Text>
          </TouchableOpacity>

          <View style={styles.tipCard}>
            <Ionicons name="bulb" size={20} color="#10b981" />
            <Text style={styles.tipText}>
              For best results, ensure good lighting and capture the entire meal
            </Text>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#ffffff",
  },
  scrollContainer: {
    flex: 1,
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
    marginBottom: 10,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 16,
    color: "#6b7280",
    textAlign: "center",
    lineHeight: 24,
  },
  buttonContainer: {
    flex: 1,
    justifyContent: "center",
  },
  mainButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    gap: 8,
  },
  primaryButton: {
    backgroundColor: "#10b981",
  },
  primaryButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
  secondaryButton: {
    backgroundColor: "#f3f4f6",
    borderWidth: 1,
    borderColor: "#d1d5db",
  },
  secondaryButtonText: {
    color: "#10b981",
    fontSize: 16,
    fontWeight: "600",
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  tipCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "#ecfdf5",
    padding: 16,
    borderRadius: 12,
    marginTop: 20,
    gap: 12,
  },
  tipText: {
    flex: 1,
    fontSize: 14,
    color: "#065f46",
    lineHeight: 20,
  },
  analyzingCard: {
    backgroundColor: "#f9fafb",
    padding: 30,
    borderRadius: 16,
    alignItems: "center",
    marginVertical: 20,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    gap: 12,
  },
  analyzingTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#065f46",
    marginTop: 8,
  },
  analyzingText: {
    fontSize: 14,
    color: "#6b7280",
    textAlign: "center",
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
  cameraTitle: {
    color: "white",
    fontSize: 18,
    fontWeight: "600",
  },
  cameraButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  cameraCenter: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  focusFrame: {
    width: 250,
    height: 250,
    borderWidth: 2,
    borderColor: "white",
    borderRadius: 12,
    backgroundColor: "transparent",
  },
  focusText: {
    color: "white",
    fontSize: 16,
    textAlign: "center",
    marginTop: 20,
    maxWidth: 280,
  },
  cameraFooter: {
    alignItems: "center",
    paddingBottom: 40,
  },
  captureButton: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: "white",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 4,
    borderColor: "rgba(255,255,255,0.5)",
  },
  captureButtonInner: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "#10b981",
  },
  captureButtonDisabled: {
    opacity: 0.5,
  },
  analysisContainer: {
    padding: 20,
  },
  imageCard: {
    position: "relative",
    marginBottom: 20,
  },
  mealImage: {
    width: "100%",
    height: 250,
    borderRadius: 12,
    backgroundColor: "#f3f4f6",
  },
  statusBadge: {
    position: "absolute",
    top: 12,
    right: 12,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#10b981",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 4,
  },
  statusText: {
    color: "white",
    fontSize: 12,
    fontWeight: "600",
  },
  unsavedBadge: {
    position: "absolute",
    top: 12,
    left: 12,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f59e0b",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 4,
  },
  unsavedText: {
    color: "white",
    fontSize: 12,
    fontWeight: "600",
  },
  analysisCard: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    marginBottom: 20,
  },
  mealHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  mealName: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#065f46",
    flex: 1,
  },
  editButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ecfdf5",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 4,
  },
  editButtonText: {
    color: "#10b981",
    fontSize: 14,
    fontWeight: "600",
  },
  mealDescription: {
    fontSize: 16,
    color: "#6b7280",
    marginBottom: 20,
    lineHeight: 24,
  },
  nutritionSection: {
    marginBottom: 24,
  },
  nutritionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#065f46",
  },
  calculatorIcon: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  calculatedText: {
    fontSize: 12,
    color: "#10b981",
    fontWeight: "500",
  },
  nutritionGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  nutritionItem: {
    flex: 1,
    minWidth: "45%",
    backgroundColor: "#f9fafb",
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  nutritionValue: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#065f46",
    marginTop: 8,
  },
  nutritionLabel: {
    fontSize: 12,
    color: "#6b7280",
    marginTop: 4,
    fontWeight: "500",
  },
  ingredientsSection: {
    marginBottom: 24,
  },
  ingredientsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  addIngredientButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#10b981",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 4,
  },
  addIngredientText: {
    color: "white",
    fontSize: 14,
    fontWeight: "600",
  },
  editableIngredients: {
    gap: 12,
  },
  dragHint: {
    fontSize: 12,
    color: "#6b7280",
    textAlign: "center",
    marginBottom: 12,
    fontStyle: "italic",
  },
  ingredientCard: {
    backgroundColor: "#f8fafc",
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    marginBottom: 8,
  },
  ingredientHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  ingredientName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1f2937",
    flex: 1,
  },
  removeButton: {
    padding: 4,
    borderRadius: 4,
    backgroundColor: "#fee2e2",
  },
  ingredientNutrition: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  quantityContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  quantityLabel: {
    fontSize: 14,
    color: "#6b7280",
    fontWeight: "500",
  },
  quantityInput: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    fontSize: 14,
    minWidth: 60,
    textAlign: "center",
  },
  quantityUnit: {
    fontSize: 14,
    color: "#6b7280",
  },
  ingredientsList: {
    gap: 8,
  },
  ingredientItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#f9fafb",
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  ingredientCalories: {
    fontSize: 12,
    color: "#6b7280",
  },
  healthSection: {
    backgroundColor: "#ecfdf5",
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#d1fae5",
  },
  healthText: {
    fontSize: 14,
    color: "#065f46",
    lineHeight: 20,
  },
  actionButtons: {
    flexDirection: "row",
    gap: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 12,
    borderRadius: 12,
    gap: 6,
  },
  discardButton: {
    backgroundColor: "#fef2f2",
    borderWidth: 1,
    borderColor: "#fecaca",
  },
  discardButtonText: {
    color: "#dc2626",
    fontSize: 14,
    fontWeight: "600",
  },
  saveChangesButton: {
    backgroundColor: "#10b981",
  },
  saveChangesButtonText: {
    color: "white",
    fontSize: 14,
    fontWeight: "600",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modal: {
    width: "90%",
    backgroundColor: "white",
    borderRadius: 16,
    padding: 20,
    maxHeight: "80%",
  },
  ingredientModal: {
    width: "90%",
    height: "80%",
    backgroundColor: "white",
    borderRadius: 16,
    padding: 20,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#065f46",
  },
  modalCloseButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#f3f4f6",
    justifyContent: "center",
    alignItems: "center",
  },
  modalSubtitle: {
    fontSize: 14,
    color: "#6b7280",
    marginBottom: 20,
    lineHeight: 20,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f9fafb",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    marginLeft: 8,
    color: "#1f2937",
  },
  ingredientOption: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
  },
  ingredientOptionContent: {
    flex: 1,
  },
  ingredientOptionName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1f2937",
    marginBottom: 4,
  },
  ingredientOptionNutrition: {
    fontSize: 12,
    color: "#6b7280",
  },
  textInput: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    minHeight: 120,
    marginBottom: 20,
    textAlignVertical: "top",
    backgroundColor: "#f9fafb",
  },
  modalButtons: {
    flexDirection: "row",
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    padding: 12,
    borderRadius: 12,
    alignItems: "center",
    backgroundColor: "#f3f4f6",
    borderWidth: 1,
    borderColor: "#d1d5db",
  },
  cancelButtonText: {
    color: "#6b7280",
    fontSize: 16,
    fontWeight: "600",
  },
});