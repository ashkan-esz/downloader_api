#!/bin/bash

cd ..

# Define the source directory and the target directory
src_dir="downloader_api"
target_dir="downloader_api_copy"

rm -rf $target_dir.zip

# Copy the source directory to the target directory
cp -r $src_dir $target_dir

# Remove the specified files from the target directory
find $target_dir -name ".idea" -exec rm -rf {} \;
find $target_dir -name ".git" -exec rm -rf {} \;
find $target_dir -name ".db" -exec rm -rf {} \;
find $target_dir -name "coverage" -exec rm -rf {} \;
find $target_dir -name "db-backups" -exec rm -rf {} \;
find $target_dir -name "node_modules" -exec rm -rf {} \;
find $target_dir -name "downloads" -exec rm -rf {} \;

# Create a zip file from the target directory
zip -r $target_dir.zip $target_dir

# Remove the target directory
rm -rf $target_dir

# Define the remote server details
remote_user="root"
remote_server=$1
remote_path="/root"

# Send the zip file to the remote server
scp $target_dir.zip $remote_user@$remote_server:$remote_path

# Log in to the remote server, unzip the file, and then log out
ssh $remote_user@$remote_server "cd $target_dir && sudo docker-compose down && cd .. && unzip $remote_path/$target_dir.zip -d $remote_path && rm $remote_path/$target_dir.zip && sudo docker-compose --compatibility up --build"
