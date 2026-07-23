"""Local packaging script for GCP Cost Optimizer agent to generate build artifacts for Terraform."""

from __future__ import annotations

import shutil
import sys
import tarfile
from pathlib import Path

# Directories
current_dir = Path(__file__).parent.resolve()
BUILD_DIR = current_dir / "build"
BUILD_DIR.mkdir(exist_ok=True)

# Staging directory for the package
package_name = "gcp_cost_optimizer_agent"
staging_dir = BUILD_DIR / package_name

def package_agent():
    print("1. Staging package directory for build...")
    if staging_dir.exists():
        shutil.rmtree(staging_dir)
    staging_dir.mkdir(exist_ok=True)

    # Copy agent.py and tools/ to the staging directory
    shutil.copy(current_dir / "agent.py", staging_dir / "agent.py")
    shutil.copytree(current_dir / "tools", staging_dir / "tools")
    # Create __init__.py
    (staging_dir / "__init__.py").touch()
    print("  ✓ Package directory staged under gcp_cost_optimizer_agent")

    print("2. Serializing agent object using cloudpickle...")
    # Add BUILD_DIR to sys.path to import from the staged package
    sys.path.insert(0, str(BUILD_DIR))
    
    import cloudpickle
    from gcp_cost_optimizer_agent.agent import root_agent

    pickle_file = BUILD_DIR / "reasoning_engine.pkl"
    with open(pickle_file, "wb") as f:
        cloudpickle.dump(root_agent, f)
    print(f"  ✓ Created {pickle_file.relative_to(current_dir)}")

    print("3. Generating requirements.txt...")
    requirements = [
        "google-adk>=1.0.0",
        "google-cloud-aiplatform[agent_engines,adk]>=1.93",
        "google-cloud-asset>=3.0",
        "google-cloud-bigquery>=3.0",
        "google-cloud-compute>=1.0",
        "google-cloud-container>=2.0",
        "google-cloud-run>=0.10.0",
        "google-auth>=2.0",
        "cryptography>=42.0",
    ]
    req_file = BUILD_DIR / "requirements.txt"
    with open(req_file, "w") as f:
        f.write("\n".join(requirements) + "\n")
    print(f"  ✓ Created {req_file.relative_to(current_dir)}")

    print("4. Creating dependencies.tar.gz archive...")
    archive_file = BUILD_DIR / "dependencies.tar.gz"
    
    with tarfile.open(archive_file, "w:gz") as tar:
        # Add the entire gcp_cost_optimizer_agent staged folder to the archive
        tar.add(staging_dir, arcname=package_name)
        
    print(f"  ✓ Created {archive_file.relative_to(current_dir)}")

if __name__ == "__main__":
    package_agent()



