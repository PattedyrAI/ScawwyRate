package com.rateit.app.ui.rating

import android.Manifest
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.widget.ArrayAdapter
import androidx.activity.result.contract.ActivityResultContracts
import androidx.activity.viewModels
import androidx.core.content.ContextCompat
import androidx.core.content.FileProvider
import androidx.core.widget.doAfterTextChanged
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.lifecycleScope
import androidx.lifecycle.repeatOnLifecycle
import com.rateit.app.R
import com.rateit.app.data.model.Category
import com.rateit.app.databinding.ActivityAddRatingBinding
import com.rateit.app.ui.common.BaseActivity
import com.rateit.app.ui.common.gone
import com.rateit.app.ui.common.loadImage
import com.rateit.app.ui.common.visible
import com.rateit.app.util.Constants
import dagger.hilt.android.AndroidEntryPoint
import kotlinx.coroutines.launch
import java.io.File

@AndroidEntryPoint
class AddRatingActivity : BaseActivity() {

    private lateinit var binding: ActivityAddRatingBinding
    private val viewModel: AddRatingViewModel by viewModels()

    private var selectedImageUri: Uri? = null
    private var tempCameraUri: Uri? = null
    private var selectedCategory: Category = Category.FOOD

    private val pickImageLauncher = registerForActivityResult(
        ActivityResultContracts.GetContent()
    ) { uri: Uri? ->
        uri?.let { setSelectedImage(it) }
    }

    private val takePictureLauncher = registerForActivityResult(
        ActivityResultContracts.TakePicture()
    ) { success ->
        if (success) {
            tempCameraUri?.let { setSelectedImage(it) }
        }
    }

    private val requestPermissionLauncher = registerForActivityResult(
        ActivityResultContracts.RequestPermission()
    ) { isGranted ->
        if (isGranted) {
            launchCamera()
        } else {
            showToast("Camera permission is required to take photos")
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityAddRatingBinding.inflate(layoutInflater)
        setContentView(binding.root)

        val groupId = intent.getStringExtra(Constants.EXTRA_GROUP_ID) ?: run {
            finish()
            return
        }

        viewModel.init(groupId)

        setupToolbar()
        setupCategoryChips()
        setupScoreSlider()
        setupImagePicker()
        setupItemNameAutocomplete()
        setupSubmitButton()
        observeState()
    }

    private fun setupToolbar() {
        setSupportActionBar(binding.toolbar)
        supportActionBar?.apply {
            setDisplayHomeAsUpEnabled(true)
            title = getString(R.string.add_rating)
        }
        binding.toolbar.setNavigationOnClickListener { finish() }
    }

    private fun setupCategoryChips() {
        binding.chipGroupCategory.setOnCheckedStateChangeListener { _, checkedIds ->
            selectedCategory = when (checkedIds.firstOrNull()) {
                R.id.chipFood -> Category.FOOD
                R.id.chipMovies -> Category.MOVIES
                R.id.chipGames -> Category.GAMES
                R.id.chipMusic -> Category.MUSIC
                R.id.chipPlaces -> Category.PLACES
                R.id.chipOther -> Category.OTHER
                else -> Category.FOOD
            }
        }
        binding.chipFood.isChecked = true
    }

    private fun setupScoreSlider() {
        binding.sliderScore.addOnChangeListener { _, value, _ ->
            binding.tvScoreValue.text = "${value.toInt()}/10"
        }
    }

    private fun setupImagePicker() {
        binding.btnAddImage.setOnClickListener {
            showImagePickerOptions()
        }

        binding.btnRemoveImage.setOnClickListener {
            clearSelectedImage()
        }
    }

    private fun setupItemNameAutocomplete() {
        binding.etItemName.doAfterTextChanged { text ->
            viewModel.searchItems(text.toString())
        }
    }

    private fun setupSubmitButton() {
        binding.btnSubmit.setOnClickListener {
            submitRating()
        }
    }

    private fun observeState() {
        lifecycleScope.launch {
            repeatOnLifecycle(Lifecycle.State.STARTED) {
                launch {
                    viewModel.uiState.collect { state ->
                        when (state) {
                            is AddRatingUiState.Idle -> {
                                binding.progressBar.gone()
                                binding.btnSubmit.isEnabled = true
                            }
                            is AddRatingUiState.Loading -> {
                                binding.progressBar.visible()
                                binding.btnSubmit.isEnabled = false
                            }
                            is AddRatingUiState.Success -> {
                                binding.progressBar.gone()
                                showToast("Rating added!")
                                finish()
                            }
                            is AddRatingUiState.Error -> {
                                binding.progressBar.gone()
                                binding.btnSubmit.isEnabled = true
                                showSnackbar(state.message)
                            }
                        }
                    }
                }

                launch {
                    viewModel.suggestions.collect { suggestions ->
                        val adapter = ArrayAdapter(
                            this@AddRatingActivity,
                            android.R.layout.simple_dropdown_item_1line,
                            suggestions.map { it.name }
                        )
                        binding.etItemName.setAdapter(adapter)
                        if (suggestions.isNotEmpty()) {
                            binding.etItemName.showDropDown()
                        }
                    }
                }
            }
        }
    }

    private fun showImagePickerOptions() {
        val options = arrayOf("Take Photo", "Choose from Gallery")
        androidx.appcompat.app.AlertDialog.Builder(this)
            .setTitle("Add Image")
            .setItems(options) { _, which ->
                when (which) {
                    0 -> checkCameraPermissionAndLaunch()
                    1 -> pickImageLauncher.launch("image/*")
                }
            }
            .show()
    }

    private fun checkCameraPermissionAndLaunch() {
        when {
            ContextCompat.checkSelfPermission(
                this,
                Manifest.permission.CAMERA
            ) == PackageManager.PERMISSION_GRANTED -> {
                launchCamera()
            }
            else -> {
                requestPermissionLauncher.launch(Manifest.permission.CAMERA)
            }
        }
    }

    private fun launchCamera() {
        val imageFile = File(cacheDir, "camera_${System.currentTimeMillis()}.jpg")
        tempCameraUri = FileProvider.getUriForFile(
            this,
            "${packageName}.fileprovider",
            imageFile
        )
        takePictureLauncher.launch(tempCameraUri)
    }

    private fun setSelectedImage(uri: Uri) {
        selectedImageUri = uri
        binding.ivSelectedImage.loadImage(uri.toString())
        binding.imagePreviewCard.visible()
        binding.btnAddImage.gone()
    }

    private fun clearSelectedImage() {
        selectedImageUri = null
        binding.imagePreviewCard.gone()
        binding.btnAddImage.visible()
    }

    private fun submitRating() {
        val itemName = binding.etItemName.text.toString()
        val score = binding.sliderScore.value.toInt()
        val comment = binding.etComment.text.toString().takeIf { it.isNotBlank() }

        viewModel.submitRating(
            itemName = itemName,
            category = selectedCategory,
            score = score,
            imageUri = selectedImageUri,
            comment = comment,
            visitedAt = null
        )
    }
}
