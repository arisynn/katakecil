# ProGuard rules for KataKecil Native Kotlin + Jetpack Compose
-keepattributes SourceFile,LineNumberTable
-keepattributes *Annotation*,Signature,InnerClasses,EnclosingMethod

# Keep kotlinx.serialization generated serializers
-keepclassmembers class * {
    @kotlinx.serialization.Serializable <fields>;
    public static ** Companion;
}
-keepclasseswithmembers class * {
    kotlinx.serialization.KSerializer serializer(...);
}

# Keep UpdatePolicy for JVM unit tests and runtime updater
-keep class id.karisyono.katakecil.UpdatePolicy { *; }
-keep class id.karisyono.katakecil.UpdatePolicy$* { *; }
