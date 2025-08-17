"use client";

import { useState, useEffect } from "react";
import { useProfile, useProfileActions } from "@/hooks/useConvexProfile";
import { useUserPreferences, usePreferencesActions } from "@/hooks/useConvexPreferences";
import { motion } from "framer-motion";
import { Edit3, Save, X, Twitter, Globe, Github, MessageCircle, User, FileText } from "lucide-react";
import toast from "react-hot-toast";

interface ProfileFormData {
  username: string;
  bio: string;
  profilePicture: string;
  socialLinks: {
    twitter: string;
    discord: string;
    website: string;
    github: string;
  };
}

export default function ProfileEditor() {
  const { profile, isLoading } = useProfile();
  const { updateProfile } = useProfileActions();
  const { preferences } = useUserPreferences();
  const { upsertUserPreferences } = usePreferencesActions();
  
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<ProfileFormData>({
    username: "",
    bio: "",
    profilePicture: "",
    socialLinks: {
      twitter: "",
      discord: "",
      website: "",
      github: "",
    },
  });
  
  const [preferencesData, setPreferencesData] = useState({
    theme: "auto" as "light" | "dark" | "auto",
    notifications: {
      delegationUpdates: true,
      proposalUpdates: true,
      rewardUpdates: true,
    },
    displaySettings: {
      compactMode: false,
      showAdvancedMetrics: false,
    },
  });

  // Initialize form data when profile loads
  useEffect(() => {
    if (profile) {
      setFormData({
        username: profile.username || "",
        bio: profile.bio || "",
        profilePicture: profile.profilePicture || "",
        socialLinks: {
          twitter: profile.socialLinks?.twitter || "",
          discord: profile.socialLinks?.discord || "",
          website: profile.socialLinks?.website || "",
          github: profile.socialLinks?.github || "",
        },
      });
    }
  }, [profile]);

  // Initialize preferences when they load
  useEffect(() => {
    if (preferences) {
      setPreferencesData({
        theme: preferences.theme || "auto",
        notifications: {
          delegationUpdates: preferences.notifications?.delegationUpdates ?? true,
          proposalUpdates: preferences.notifications?.proposalUpdates ?? true,
          rewardUpdates: preferences.notifications?.rewardUpdates ?? true,
        },
        displaySettings: {
          compactMode: preferences.displaySettings?.compactMode ?? false,
          showAdvancedMetrics: preferences.displaySettings?.showAdvancedMetrics ?? false,
        },
      });
    }
  }, [preferences]);

  const handleSaveProfile = async () => {
    try {
      if (!profile?.address) {
        toast.error("No profile address found");
        return;
      }

      await updateProfile({
        address: profile.address,
        username: formData.username,
        bio: formData.bio,
        profilePicture: formData.profilePicture,
        socialLinks: formData.socialLinks,
      });

      toast.success("Profile updated successfully!");
      setIsEditing(false);
    } catch (error) {
      console.error("Error updating profile:", error);
      toast.error("Failed to update profile");
    }
  };

  const handleSavePreferences = async () => {
    try {
      if (!profile?.address) {
        toast.error("No profile address found");
        return;
      }

      await upsertUserPreferences({
        address: profile.address,
        theme: preferencesData.theme,
        notifications: preferencesData.notifications,
        displaySettings: preferencesData.displaySettings,
      });

      toast.success("Preferences updated successfully!");
    } catch (error) {
      console.error("Error updating preferences:", error);
      toast.error("Failed to update preferences");
    }
  };

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-[#1D2833] rounded-lg p-6 border border-[#efefef] dark:border-[#232F3B]">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 dark:bg-[#33475b] rounded w-1/4"></div>
          <div className="space-y-2">
            <div className="h-4 bg-gray-200 dark:bg-[#33475b] rounded"></div>
            <div className="h-4 bg-gray-200 dark:bg-[#33475b] rounded w-5/6"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="bg-white dark:bg-[#1D2833] rounded-lg p-6 border border-[#efefef] dark:border-[#232F3B] text-center">
        <User className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
          No Profile Found
        </h3>
        <p className="text-gray-600 dark:text-gray-400">
          Create a profile to get started with Compensator
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Profile Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white dark:bg-[#1D2833] rounded-lg border border-[#efefef] dark:border-[#232F3B]"
      >
        <div className="p-6 border-b border-[#efefef] dark:border-[#232F3B]">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Profile Information
            </h3>
            <button
              onClick={() => setIsEditing(!isEditing)}
              className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-[#2d3d4d] rounded-lg hover:bg-gray-200 dark:hover:bg-[#3d4d5d] transition-colors"
            >
              {isEditing ? <X className="h-4 w-4" /> : <Edit3 className="h-4 w-4" />}
              {isEditing ? "Cancel" : "Edit"}
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Username */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              <User className="h-4 w-4 inline mr-2" />
              Username
            </label>
            {isEditing ? (
              <input
                type="text"
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-[#2d3d4d] rounded-lg bg-white dark:bg-[#1D2833] text-gray-900 dark:text-white focus:ring-2 focus:ring-[#10b981] focus:border-transparent"
                placeholder="Enter your username"
              />
            ) : (
              <p className="text-gray-900 dark:text-white">
                {formData.username || "No username set"}
              </p>
            )}
          </div>

          {/* Bio */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              <FileText className="h-4 w-4 inline mr-2" />
              Bio
            </label>
            {isEditing ? (
              <textarea
                value={formData.bio}
                onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 dark:border-[#2d3d4d] rounded-lg bg-white dark:bg-[#1D2833] text-gray-900 dark:text-white focus:ring-2 focus:ring-[#10b981] focus:border-transparent"
                placeholder="Tell us about yourself..."
              />
            ) : (
              <p className="text-gray-900 dark:text-white">
                {formData.bio || "No bio set"}
              </p>
            )}
          </div>

          {/* Profile Picture */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Profile Picture URL
            </label>
            {isEditing ? (
              <input
                type="url"
                value={formData.profilePicture}
                onChange={(e) => setFormData({ ...formData, profilePicture: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-[#2d3d4d] rounded-lg bg-white dark:bg-[#1D2833] text-gray-900 dark:text-white focus:ring-2 focus:ring-[#10b981] focus:border-transparent"
                placeholder="https://example.com/image.jpg"
              />
            ) : (
              <div className="flex items-center gap-3">
                {formData.profilePicture ? (
                  <img
                    src={formData.profilePicture}
                    alt="Profile"
                    className="w-12 h-12 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-12 h-12 bg-gray-200 dark:bg-[#33475b] rounded-full flex items-center justify-center">
                    <User className="h-6 w-6 text-gray-400" />
                  </div>
                )}
                <span className="text-gray-900 dark:text-white">
                  {formData.profilePicture || "No profile picture set"}
                </span>
              </div>
            )}
          </div>

          {/* Social Links */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              Social Links
            </label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Twitter */}
              <div>
                <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 mb-1">
                  <Twitter className="h-4 w-4" />
                  Twitter
                </label>
                {isEditing ? (
                  <input
                    type="url"
                    value={formData.socialLinks.twitter}
                    onChange={(e) => setFormData({
                      ...formData,
                      socialLinks: { ...formData.socialLinks, twitter: e.target.value }
                    })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-[#2d3d4d] rounded-lg bg-white dark:bg-[#1D2833] text-gray-900 dark:text-white focus:ring-2 focus:ring-[#10b981] focus:border-transparent"
                    placeholder="https://twitter.com/username"
                  />
                ) : (
                  <p className="text-gray-900 dark:text-white">
                    {formData.socialLinks.twitter || "Not set"}
                  </p>
                )}
              </div>

              {/* Discord */}
              <div>
                <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 mb-1">
                  <MessageCircle className="h-4 w-4" />
                  Discord
                </label>
                {isEditing ? (
                  <input
                    type="text"
                    value={formData.socialLinks.discord}
                    onChange={(e) => setFormData({
                      ...formData,
                      socialLinks: { ...formData.socialLinks, discord: e.target.value }
                    })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-[#2d3d4d] rounded-lg bg-white dark:bg-[#1D2833] text-gray-900 dark:text-white focus:ring-2 focus:ring-[#10b981] focus:border-transparent"
                    placeholder="username#1234"
                  />
                ) : (
                  <p className="text-gray-900 dark:text-white">
                    {formData.socialLinks.discord || "Not set"}
                  </p>
                )}
              </div>

              {/* Website */}
              <div>
                <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 mb-1">
                  <Globe className="h-4 w-4" />
                  Website
                </label>
                {isEditing ? (
                  <input
                    type="url"
                    value={formData.socialLinks.website}
                    onChange={(e) => setFormData({
                      ...formData,
                      socialLinks: { ...formData.socialLinks, website: e.target.value }
                    })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-[#2d3d4d] rounded-lg bg-white dark:bg-[#1D2833] text-gray-900 dark:text-white focus:ring-2 focus:ring-[#10b981] focus:border-transparent"
                    placeholder="https://example.com"
                  />
                ) : (
                  <p className="text-gray-900 dark:text-white">
                    {formData.socialLinks.website || "Not set"}
                  </p>
                )}
              </div>

              {/* GitHub */}
              <div>
                <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 mb-1">
                  <Github className="h-4 w-4" />
                  GitHub
                </label>
                {isEditing ? (
                  <input
                    type="url"
                    value={formData.socialLinks.github}
                    onChange={(e) => setFormData({
                      ...formData,
                      socialLinks: { ...formData.socialLinks, github: e.target.value }
                    })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-[#2d3d4d] rounded-lg bg-white dark:bg-[#1D2833] text-gray-900 dark:text-white focus:ring-2 focus:ring-[#10b981] focus:border-transparent"
                    placeholder="https://github.com/username"
                  />
                ) : (
                  <p className="text-gray-900 dark:text-white">
                    {formData.socialLinks.github || "Not set"}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Save Button */}
          {isEditing && (
            <div className="flex justify-end">
              <button
                onClick={handleSaveProfile}
                className="flex items-center gap-2 px-4 py-2 bg-[#10b981] text-white rounded-lg hover:bg-emerald-600 transition-colors"
              >
                <Save className="h-4 w-4" />
                Save Profile
              </button>
            </div>
          )}
        </div>
      </motion.div>

      {/* Preferences Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-white dark:bg-[#1D2833] rounded-lg border border-[#efefef] dark:border-[#232F3B]"
      >
        <div className="p-6 border-b border-[#efefef] dark:border-[#232F3B]">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Preferences
          </h3>
        </div>

        <div className="p-6 space-y-6">
          {/* Theme */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Theme
            </label>
            <select
              value={preferencesData.theme}
              onChange={(e) => setPreferencesData({
                ...preferencesData,
                theme: e.target.value as "light" | "dark" | "auto"
              })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-[#2d3d4d] rounded-lg bg-white dark:bg-[#1D2833] text-gray-900 dark:text-white focus:ring-2 focus:ring-[#10b981] focus:border-transparent"
              aria-label="Select theme preference"
            >
              <option value="auto">Auto</option>
              <option value="light">Light</option>
              <option value="dark">Dark</option>
            </select>
          </div>

          {/* Notifications */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              Notifications
            </label>
            <div className="space-y-3">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={preferencesData.notifications.delegationUpdates}
                  onChange={(e) => setPreferencesData({
                    ...preferencesData,
                    notifications: {
                      ...preferencesData.notifications,
                      delegationUpdates: e.target.checked
                    }
                  })}
                  className="mr-3 h-4 w-4 text-[#10b981] focus:ring-[#10b981] border-gray-300 rounded"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  Delegation updates
                </span>
              </label>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={preferencesData.notifications.proposalUpdates}
                  onChange={(e) => setPreferencesData({
                    ...preferencesData,
                    notifications: {
                      ...preferencesData.notifications,
                      proposalUpdates: e.target.checked
                    }
                  })}
                  className="mr-3 h-4 w-4 text-[#10b981] focus:ring-[#10b981] border-gray-300 rounded"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  Proposal updates
                </span>
              </label>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={preferencesData.notifications.rewardUpdates}
                  onChange={(e) => setPreferencesData({
                    ...preferencesData,
                    notifications: {
                      ...preferencesData.notifications,
                      rewardUpdates: e.target.checked
                    }
                  })}
                  className="mr-3 h-4 w-4 text-[#10b981] focus:ring-[#10b981] border-gray-300 rounded"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  Reward updates
                </span>
              </label>
            </div>
          </div>

          {/* Display Settings */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              Display Settings
            </label>
            <div className="space-y-3">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={preferencesData.displaySettings.compactMode}
                  onChange={(e) => setPreferencesData({
                    ...preferencesData,
                    displaySettings: {
                      ...preferencesData.displaySettings,
                      compactMode: e.target.checked
                    }
                  })}
                  className="mr-3 h-4 w-4 text-[#10b981] focus:ring-[#10b981] border-gray-300 rounded"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  Compact mode
                </span>
              </label>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={preferencesData.displaySettings.showAdvancedMetrics}
                  onChange={(e) => setPreferencesData({
                    ...preferencesData,
                    displaySettings: {
                      ...preferencesData.displaySettings,
                      showAdvancedMetrics: e.target.checked
                    }
                  })}
                  className="mr-3 h-4 w-4 text-[#10b981] focus:ring-[#10b981] border-gray-300 rounded"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  Show advanced metrics
                </span>
              </label>
            </div>
          </div>

          {/* Save Preferences Button */}
          <div className="flex justify-end">
            <button
              onClick={handleSavePreferences}
              className="flex items-center gap-2 px-4 py-2 bg-[#10b981] text-white rounded-lg hover:bg-emerald-600 transition-colors"
            >
              <Save className="h-4 w-4" />
              Save Preferences
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
