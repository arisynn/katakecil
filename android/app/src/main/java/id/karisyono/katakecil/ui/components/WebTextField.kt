package id.karisyono.katakecil.ui.components

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.ProvideTextStyle
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.input.VisualTransformation
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import id.karisyono.katakecil.core.theme.KataKecilFonts
import id.karisyono.katakecil.core.theme.LocalKataKecilPalette

/** Fixed label and stable editor identity; opening a panel never requests focus. */
@Composable
fun WebTextField(
    value: String,
    onValueChange: (String) -> Unit,
    modifier: Modifier = Modifier,
    enabled: Boolean = true,
    readOnly: Boolean = false,
    label: (@Composable () -> Unit)? = null,
    placeholder: (@Composable () -> Unit)? = null,
    leadingIcon: (@Composable () -> Unit)? = null,
    trailingIcon: (@Composable () -> Unit)? = null,
    supportingText: (@Composable () -> Unit)? = null,
    isError: Boolean = false,
    visualTransformation: VisualTransformation = VisualTransformation.None,
    keyboardOptions: KeyboardOptions = KeyboardOptions.Default,
    keyboardActions: KeyboardActions = KeyboardActions.Default,
    singleLine: Boolean = false,
    maxLines: Int = if (singleLine) 1 else Int.MAX_VALUE,
    minLines: Int = 1
) {
    val palette = LocalKataKecilPalette.current
    Column(modifier) {
        if (label != null) {
            ProvideTextStyle(TextStyle(color = palette.textPrimary, fontFamily = KataKecilFonts.Ui, fontSize = 12.sp)) { label() }
            Spacer(Modifier.height(6.dp))
        }
        androidx.compose.material3.OutlinedTextField(value, onValueChange,
            modifier = Modifier.fillMaxWidth(), enabled = enabled, readOnly = readOnly,
            textStyle = TextStyle(fontFamily = KataKecilFonts.Ui, fontSize = 14.sp),
            placeholder = placeholder, leadingIcon = leadingIcon, trailingIcon = trailingIcon,
            supportingText = supportingText, isError = isError,
            visualTransformation = visualTransformation, keyboardOptions = keyboardOptions, keyboardActions = keyboardActions,
            singleLine = singleLine, maxLines = maxLines, minLines = minLines,
            shape = RoundedCornerShape(12.dp),
            colors = OutlinedTextFieldDefaults.colors(focusedTextColor = palette.textPrimary, unfocusedTextColor = palette.textPrimary,
                focusedContainerColor = palette.surface.copy(alpha = .30f), unfocusedContainerColor = palette.surface.copy(alpha = .15f),
                focusedBorderColor = palette.accent, unfocusedBorderColor = palette.border, cursorColor = palette.accent))
    }
}
